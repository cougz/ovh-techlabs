from celery import current_task
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID

from core.celery_app import celery_app
from core.database import SessionLocal
from core.logging import get_logger
from models.attendee import Attendee
from models.deployment_log import DeploymentLog
from models.workshop import Workshop
from services.terraform_service import terraform_service
from tasks.websocket_updates import (
    broadcast_status_update, 
    broadcast_deployment_log,
    broadcast_deployment_progress
)

logger = get_logger(__name__)

def update_workshop_status_based_on_attendees(db: Session, workshop_id: UUID):
    """Update workshop status based on attendee statuses."""
    try:
        workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
        if not workshop:
            return
        
        attendees = db.query(Attendee).filter(Attendee.workshop_id == workshop_id).all()
        if not attendees:
            return
        
        attendee_statuses = [a.status for a in attendees]
        
        # If any attendee failed, mark workshop as failed
        if 'failed' in attendee_statuses:
            if workshop.status != 'failed':
                workshop.status = 'failed'
                db.commit()
                broadcast_status_update(
                    str(workshop_id),
                    "workshop",
                    str(workshop_id),
                    "failed",
                    {"reason": "One or more attendees failed deployment"}
                )
                logger.info(f"Workshop {workshop_id} marked as failed due to attendee failures")
        
        # If all attendees are active, mark workshop as active
        elif all(status == 'active' for status in attendee_statuses):
            if workshop.status != 'active':
                workshop.status = 'active'
                db.commit()
                broadcast_status_update(
                    str(workshop_id),
                    "workshop", 
                    str(workshop_id),
                    "active"
                )
                logger.info(f"Workshop {workshop_id} marked as active - all attendees deployed")
        
        # If any attendees are still deploying, keep workshop as deploying
        elif 'deploying' in attendee_statuses:
            if workshop.status != 'deploying':
                workshop.status = 'deploying'
                db.commit()
                broadcast_status_update(
                    str(workshop_id),
                    "workshop",
                    str(workshop_id), 
                    "deploying"
                )
        
    except Exception as e:
        logger.error(f"Error updating workshop status: {str(e)}")
        db.rollback()

@celery_app.task(bind=True)
def deploy_attendee_resources(self, attendee_id: str):
    """Deploy OVH resources for a specific attendee."""
    db = SessionLocal()
    attendee = None
    deployment_log = None
    
    try:
        # Get attendee
        attendee = db.query(Attendee).filter(Attendee.id == UUID(attendee_id)).first()
        if not attendee:
            logger.error(f"Attendee not found: {attendee_id}")
            return {"error": "Attendee not found"}
        
        # Create deployment log
        deployment_log = DeploymentLog(
            attendee_id=attendee.id,
            action="deploy",
            status="started"
        )
        db.add(deployment_log)
        db.commit()
        
        # Update attendee status
        attendee.status = "deploying"
        db.commit()
        
        # Broadcast status update
        broadcast_status_update(
            str(attendee.workshop_id),
            "attendee",
            str(attendee.id),
            "deploying"
        )
        
        # Update deployment log status
        deployment_log.status = "running"
        db.commit()
        
        # Broadcast deployment start
        broadcast_deployment_log(
            str(attendee.workshop_id),
            str(attendee.id),
            "deploy",
            "started"
        )
        
        # Create terraform workspace
        workspace_name = f"attendee-{attendee_id}"
        terraform_config = {
            "project_description": f"TechLabs environment for {attendee.username}",
            "username": attendee.username,
            "email": attendee.email
        }
        
        logger.info(f"Creating terraform workspace for attendee {attendee_id}")
        broadcast_deployment_progress(
            str(attendee.workshop_id),
            str(attendee.id),
            10,
            "Initializing workspace"
        )
        
        if not terraform_service.create_workspace(workspace_name, terraform_config):
            raise Exception("Failed to create terraform workspace")
        
        # Plan deployment
        logger.info(f"Planning terraform deployment for attendee {attendee_id}")
        broadcast_deployment_progress(
            str(attendee.workshop_id),
            str(attendee.id),
            40,
            "Planning infrastructure"
        )
        
        success, plan_output = terraform_service.plan(workspace_name)
        if not success:
            raise Exception(f"Terraform plan failed: {plan_output}")
        
        broadcast_deployment_log(
            str(attendee.workshop_id),
            str(attendee.id),
            "plan",
            "completed",
            plan_output
        )
        
        # Apply deployment
        logger.info(f"Applying terraform deployment for attendee {attendee_id}")
        broadcast_deployment_progress(
            str(attendee.workshop_id),
            str(attendee.id),
            70,
            "Creating OVH resources"
        )
        
        success, apply_output = terraform_service.apply(workspace_name)
        if not success:
            raise Exception(f"Terraform apply failed: {apply_output}")
        
        broadcast_deployment_log(
            str(attendee.workshop_id),
            str(attendee.id),
            "apply",
            "completed",
            apply_output
        )
        
        # Get outputs
        broadcast_deployment_progress(
            str(attendee.workshop_id),
            str(attendee.id),
            90,
            "Configuring access"
        )
        
        outputs = terraform_service.get_outputs(workspace_name)
        
        # Update attendee with OVH project information
        if "project_id" in outputs:
            attendee.ovh_project_id = outputs["project_id"]["value"]
        if "user_urn" in outputs:
            attendee.ovh_user_urn = outputs["user_urn"]["value"]
        
        attendee.status = "active"
        db.commit()
        
        # Update deployment log
        deployment_log.status = "completed"
        deployment_log.completed_at = datetime.utcnow()
        deployment_log.terraform_output = apply_output
        db.commit()
        
        # Broadcast completion
        broadcast_deployment_progress(
            str(attendee.workshop_id),
            str(attendee.id),
            100,
            "Deployment completed"
        )
        
        broadcast_status_update(
            str(attendee.workshop_id),
            "attendee",
            str(attendee.id),
            "active",
            {
                "project_id": outputs.get("project_id", {}).get("value"),
                "user_urn": outputs.get("user_urn", {}).get("value")
            }
        )
        
        # Update workshop status based on attendee statuses
        update_workshop_status_based_on_attendees(db, attendee.workshop_id)
        
        logger.info(f"Successfully deployed resources for attendee {attendee_id}")
        
        return {
            "success": True,
            "attendee_id": attendee_id,
            "project_id": outputs.get("project_id", {}).get("value"),
            "user_urn": outputs.get("user_urn", {}).get("value")
        }
        
    except Exception as e:
        logger.error(f"Error deploying resources for attendee {attendee_id}: {str(e)}")
        
        # Update attendee status
        if attendee:
            attendee.status = "failed"
            db.commit()
            
            # Broadcast failure
            broadcast_status_update(
                str(attendee.workshop_id),
                "attendee",
                str(attendee.id),
                "failed",
                {"error": str(e)}
            )
            
            broadcast_deployment_log(
                str(attendee.workshop_id),
                str(attendee.id),
                "deploy",
                "failed",
                error=str(e)
            )
            
            # Update workshop status based on attendee statuses
            update_workshop_status_based_on_attendees(db, attendee.workshop_id)
        
        # Update deployment log
        if deployment_log:
            deployment_log.status = "failed"
            deployment_log.completed_at = datetime.utcnow()
            deployment_log.error_message = str(e)
            db.commit()
        
        return {"error": str(e), "attendee_id": attendee_id}
        
    finally:
        db.close()

@celery_app.task(bind=True)
def destroy_attendee_resources(self, attendee_id: str):
    """Destroy OVH resources for a specific attendee."""
    db = SessionLocal()
    attendee = None
    deployment_log = None
    
    try:
        # Get attendee
        attendee = db.query(Attendee).filter(Attendee.id == UUID(attendee_id)).first()
        if not attendee:
            logger.error(f"Attendee not found: {attendee_id}")
            return {"error": "Attendee not found"}
        
        # Create deployment log
        deployment_log = DeploymentLog(
            attendee_id=attendee.id,
            action="destroy",
            status="started"
        )
        db.add(deployment_log)
        db.commit()
        
        # Update attendee status
        attendee.status = "deleting"
        db.commit()
        
        # Update deployment log status
        deployment_log.status = "running"
        db.commit()
        
        # Destroy terraform resources
        workspace_name = f"attendee-{attendee_id}"
        
        logger.info(f"Destroying terraform resources for attendee {attendee_id}")
        
        success, destroy_output = terraform_service.destroy(workspace_name)
        if not success:
            raise Exception(f"Terraform destroy failed: {destroy_output}")
        
        # Clean up workspace
        terraform_service.cleanup_workspace(workspace_name)
        
        # Update attendee
        attendee.status = "deleted"
        attendee.ovh_project_id = None
        attendee.ovh_user_urn = None
        db.commit()
        
        # Update deployment log
        deployment_log.status = "completed"
        deployment_log.completed_at = datetime.utcnow()
        deployment_log.terraform_output = destroy_output
        db.commit()
        
        # Update workshop status based on attendee statuses
        update_workshop_status_based_on_attendees(db, attendee.workshop_id)
        
        logger.info(f"Successfully destroyed resources for attendee {attendee_id}")
        
        return {
            "success": True,
            "attendee_id": attendee_id
        }
        
    except Exception as e:
        logger.error(f"Error destroying resources for attendee {attendee_id}: {str(e)}")
        
        # Update attendee status
        if attendee:
            attendee.status = "failed"
            db.commit()
            
            # Update workshop status based on attendee statuses
            update_workshop_status_based_on_attendees(db, attendee.workshop_id)
        
        # Update deployment log
        if deployment_log:
            deployment_log.status = "failed"
            deployment_log.completed_at = datetime.utcnow()
            deployment_log.error_message = str(e)
            db.commit()
        
        return {"error": str(e), "attendee_id": attendee_id}
        
    finally:
        db.close()

@celery_app.task
def health_check_resources():
    """Periodic task to check health of deployed resources."""
    db = SessionLocal()
    
    try:
        # Get all active attendees
        active_attendees = db.query(Attendee).filter(Attendee.status == "active").all()
        
        for attendee in active_attendees:
            workspace_name = f"attendee-{attendee.id}"
            
            # Check if terraform workspace still exists
            if not terraform_service._get_workspace_path(workspace_name).exists():
                logger.warning(f"Terraform workspace missing for attendee {attendee.id}")
                attendee.status = "failed"
                db.commit()
                continue
            
            # Get terraform outputs to verify resources
            outputs = terraform_service.get_outputs(workspace_name)
            if not outputs:
                logger.warning(f"No terraform outputs for attendee {attendee.id}")
                attendee.status = "failed"
                db.commit()
        
        logger.info(f"Health check completed for {len(active_attendees)} active attendees")
        
    except Exception as e:
        logger.error(f"Error during health check: {str(e)}")
        
    finally:
        db.close()

@celery_app.task(bind=True)
def deploy_workshop_attendees_sequential(self, workshop_id: str):
    """Deploy all attendees in a workshop sequentially to avoid quota issues."""
    db = SessionLocal()
    
    try:
        workshop = db.query(Workshop).filter(Workshop.id == UUID(workshop_id)).first()
        if not workshop:
            logger.error(f"Workshop not found: {workshop_id}")
            return {"error": "Workshop not found"}
        
        # Get all attendees for this workshop
        attendees = db.query(Attendee).filter(Attendee.workshop_id == UUID(workshop_id)).all()
        if not attendees:
            logger.info(f"No attendees found for workshop {workshop_id}")
            workshop.status = 'active'  # Workshop is active even with no attendees
            db.commit()
            return {"message": "No attendees to deploy", "attendees_deployed": 0}
        
        logger.info(f"Starting sequential deployment of {len(attendees)} attendees for workshop {workshop_id}")
        
        deployed_count = 0
        failed_count = 0
        
        for i, attendee in enumerate(attendees):
            logger.info(f"Deploying attendee {i+1}/{len(attendees)}: {attendee.username}")
            
            # Update task progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': i + 1,
                    'total': len(attendees),
                    'status': f'Deploying {attendee.username}',
                    'attendee_id': str(attendee.id)
                }
            )
            
            # Broadcast workshop deployment progress
            broadcast_deployment_progress(
                str(workshop_id),
                i + 1,
                len(attendees),
                f"Deploying {attendee.username}..."
            )
            
            try:
                # Call the individual attendee deployment task synchronously
                result = deploy_attendee_resources.apply(args=[str(attendee.id)])
                
                if result.successful() and not result.result.get('error'):
                    deployed_count += 1
                    logger.info(f"Successfully deployed {attendee.username}")
                else:
                    failed_count += 1
                    error_msg = result.result.get('error', 'Unknown error')
                    logger.error(f"Failed to deploy {attendee.username}: {error_msg}")
                    
                    # If deployment fails, mark attendee as failed and continue with next
                    attendee.status = 'failed'
                    db.commit()
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Exception during deployment of {attendee.username}: {str(e)}")
                attendee.status = 'failed'
                db.commit()
        
        # Update workshop status based on results
        if failed_count == 0:
            workshop.status = 'active'
            status_message = f"All {deployed_count} attendees deployed successfully"
        elif deployed_count > 0:
            workshop.status = 'active'  # Partial success is still active
            status_message = f"{deployed_count} attendees deployed, {failed_count} failed"
        else:
            workshop.status = 'failed'
            status_message = f"All {failed_count} attendees failed deployment"
        
        db.commit()
        
        # Broadcast final status
        broadcast_status_update(
            str(workshop_id),
            "workshop", 
            str(workshop_id),
            workshop.status,
            {"message": status_message}
        )
        
        logger.info(f"Sequential deployment completed for workshop {workshop_id}: {status_message}")
        
        return {
            "message": status_message,
            "attendees_deployed": deployed_count,
            "attendees_failed": failed_count,
            "workshop_status": workshop.status
        }
        
    except Exception as e:
        logger.error(f"Error during sequential workshop deployment {workshop_id}: {str(e)}")
        
        # Update workshop status to failed
        try:
            workshop = db.query(Workshop).filter(Workshop.id == UUID(workshop_id)).first()
            if workshop:
                workshop.status = 'failed'
                db.commit()
        except:
            pass
        
        return {"error": str(e)}
        
    finally:
        db.close()
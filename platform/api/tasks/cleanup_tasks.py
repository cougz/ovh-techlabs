from celery import current_task
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from core.celery_app import celery_app
from core.database import SessionLocal
from core.logging import get_logger
from models.workshop import Workshop
from models.attendee import Attendee
from services.workshop_status_service import WorkshopStatusService
from tasks.terraform_tasks import destroy_attendee_resources

logger = get_logger(__name__)

@celery_app.task
def check_workshop_end_dates():
    """Check for workshops that have ended and schedule cleanup."""
    db = SessionLocal()
    
    try:
        now = datetime.now(ZoneInfo("UTC"))
        
        # Get workshops that have ended but are still active
        ended_workshops = db.query(Workshop).filter(
            Workshop.end_date <= now,
            Workshop.status.in_(["active", "completed"])
        ).all()
        
        for workshop in ended_workshops:
            # Schedule deletion 72 hours after end date
            if not workshop.deletion_scheduled_at:
                # Calculate deletion time in workshop's timezone
                workshop_tz = ZoneInfo(workshop.timezone)
                end_date_in_tz = workshop.end_date.astimezone(workshop_tz)
                deletion_time_in_tz = end_date_in_tz + timedelta(hours=72)
                
                # Convert back to UTC for storage
                workshop.deletion_scheduled_at = deletion_time_in_tz.astimezone(ZoneInfo("UTC"))
                workshop.status = "completed"
                db.commit()
                
                logger.info(f"Scheduled workshop {workshop.id} for deletion at {workshop.deletion_scheduled_at} (workshop timezone: {workshop.timezone})")
        
        logger.info(f"Processed {len(ended_workshops)} ended workshops")
        
    except Exception as e:
        logger.error(f"Error checking workshop end dates: {str(e)}")
        
    finally:
        db.close()

@celery_app.task
def cleanup_expired_workshops():
    """Clean up workshops that are scheduled for deletion."""
    db = SessionLocal()
    
    try:
        now = datetime.now(ZoneInfo("UTC"))
        
        # Get workshops scheduled for deletion
        expired_workshops = db.query(Workshop).filter(
            Workshop.deletion_scheduled_at <= now,
            Workshop.status.in_(["completed", "active"])
        ).all()
        
        for workshop in expired_workshops:
            logger.info(f"Starting cleanup for expired workshop {workshop.id}")
            
            # Update workshop status
            workshop.status = "deleting"
            db.commit()
            
            # Get all attendees with active resources
            attendees_to_cleanup = db.query(Attendee).filter(
                Attendee.workshop_id == workshop.id,
                Attendee.status.in_(["active", "failed"])
            ).all()
            
            # Queue destruction tasks for each attendee
            for attendee in attendees_to_cleanup:
                destroy_attendee_resources.delay(str(attendee.id))
            
            logger.info(f"Queued cleanup for {len(attendees_to_cleanup)} attendees in workshop {workshop.id}")
        
        logger.info(f"Processed {len(expired_workshops)} expired workshops")
        
    except Exception as e:
        logger.error(f"Error cleaning up expired workshops: {str(e)}")
        
    finally:
        db.close()

@celery_app.task
def update_workshop_statuses():
    """Update workshop statuses based on attendee deployment results."""
    db = SessionLocal()
    
    try:
        # Get workshops in deploying status
        deploying_workshops = db.query(Workshop).filter(
            Workshop.status == "deploying"
        ).all()
        
        for workshop in deploying_workshops:
            attendees = db.query(Attendee).filter(
                Attendee.workshop_id == workshop.id
            ).all()
            
            if not attendees:
                continue
            
            attendee_statuses = [attendee.status for attendee in attendees]
            
            # Check if any attendees are still deploying
            deploying_count = attendee_statuses.count('deploying')
            
            # If no attendees are still deploying, update status using least sane logic
            if deploying_count == 0:
                old_status = workshop.status
                new_status = WorkshopStatusService.update_workshop_status_from_attendees(str(workshop.id), db)
                
                if new_status and old_status != new_status:
                    logger.info(f"Updated workshop {workshop.id} status from {old_status} to {new_status} using least sane status logic")
        
        # Also check for workshops that might be stuck in deploying
        stuck_threshold = datetime.now(ZoneInfo("UTC")) - timedelta(minutes=30)
        stuck_workshops = db.query(Workshop).filter(
            Workshop.status == "deploying",
            Workshop.updated_at < stuck_threshold
        ).all()
        
        for workshop in stuck_workshops:
            logger.warning(f"Workshop {workshop.id} has been deploying for >30 minutes, marking as failed")
            workshop.status = "failed"
            db.commit()
        
        logger.info(f"Processed {len(deploying_workshops)} deploying workshops")
        
    except Exception as e:
        logger.error(f"Error updating workshop statuses: {str(e)}")
        
    finally:
        db.close()

@celery_app.task
def cleanup_orphaned_workspaces():
    """Clean up orphaned Terraform workspaces."""
    db = SessionLocal()
    
    try:
        from services.terraform_service import terraform_service
        
        # Get all workspace directories
        workspace_dir = terraform_service.workspace_dir
        if not workspace_dir.exists():
            return
        
        orphaned_count = 0
        
        for workspace_path in workspace_dir.iterdir():
            if not workspace_path.is_dir():
                continue
            
            workspace_name = workspace_path.name
            
            # Check if workspace corresponds to an active attendee
            if workspace_name.startswith("attendee-"):
                attendee_id = workspace_name.replace("attendee-", "")
                
                try:
                    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
                    
                    # If attendee doesn't exist or is deleted, clean up workspace
                    if not attendee or attendee.status == "deleted":
                        logger.info(f"Cleaning up orphaned workspace: {workspace_name}")
                        terraform_service.cleanup_workspace(workspace_name)
                        orphaned_count += 1
                        
                except Exception as e:
                    logger.error(f"Error processing workspace {workspace_name}: {str(e)}")
                    continue
        
        logger.info(f"Cleaned up {orphaned_count} orphaned workspaces")
        
    except Exception as e:
        logger.error(f"Error cleaning up orphaned workspaces: {str(e)}")
        
    finally:
        db.close()
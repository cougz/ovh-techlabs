from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from core.database import get_db
from models.workshop import Workshop
from models.attendee import Attendee
from api.routes.auth import get_current_user
from schemas.workshop import WorkshopCreate, WorkshopUpdate, WorkshopResponse, WorkshopSummary

router = APIRouter()

@router.post("/", response_model=WorkshopResponse)
async def create_workshop(
    workshop: WorkshopCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new workshop."""
    # Validate dates
    if workshop.start_date >= workshop.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Calculate deletion schedule (72 hours after end date)
    deletion_scheduled_at = workshop.end_date + timedelta(hours=72)
    
    db_workshop = Workshop(
        name=workshop.name,
        description=workshop.description,
        start_date=workshop.start_date,
        end_date=workshop.end_date,
        deletion_scheduled_at=deletion_scheduled_at
    )
    
    db.add(db_workshop)
    db.commit()
    db.refresh(db_workshop)
    
    return db_workshop

@router.get("/", response_model=List[WorkshopSummary])
async def list_workshops(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """List all workshops with optional filtering."""
    query = db.query(Workshop)
    
    if status:
        query = query.filter(Workshop.status == status)
    
    workshops = query.offset(skip).limit(limit).all()
    
    # Convert to summary format with attendee counts
    workshop_summaries = []
    for workshop in workshops:
        attendee_count = db.query(Attendee).filter(Attendee.workshop_id == workshop.id).count()
        active_attendees = db.query(Attendee).filter(
            Attendee.workshop_id == workshop.id,
            Attendee.status == 'active'
        ).count()
        
        workshop_summaries.append(WorkshopSummary(
            id=workshop.id,
            name=workshop.name,
            description=workshop.description,
            start_date=workshop.start_date,
            end_date=workshop.end_date,
            status=workshop.status,
            created_at=workshop.created_at,
            attendee_count=attendee_count,
            active_attendees=active_attendees
        ))
    
    return workshop_summaries

@router.get("/{workshop_id}", response_model=WorkshopResponse)
async def get_workshop(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get workshop details."""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    return workshop

@router.put("/{workshop_id}", response_model=WorkshopResponse)
async def update_workshop(
    workshop_id: UUID,
    workshop_update: WorkshopUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update workshop details."""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Update fields
    update_data = workshop_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workshop, field, value)
    
    # Validate dates if both are provided
    if workshop.start_date >= workshop.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Recalculate deletion schedule if end date changed
    if 'end_date' in update_data:
        workshop.deletion_scheduled_at = workshop.end_date + timedelta(hours=72)
    
    db.commit()
    db.refresh(workshop)
    
    return workshop

@router.delete("/{workshop_id}")
async def delete_workshop(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Delete a workshop and all associated resources."""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Check if workshop has active deployments
    active_attendees = db.query(Attendee).filter(
        Attendee.workshop_id == workshop_id,
        Attendee.status.in_(['active', 'deploying'])
    ).count()
    
    if active_attendees > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete workshop with active deployments"
        )
    
    db.delete(workshop)
    db.commit()
    
    return {"message": "Workshop deleted successfully"}

@router.post("/{workshop_id}/deploy")
async def deploy_workshop(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Deploy resources for all attendees in the workshop."""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Update workshop status
    workshop.status = 'deploying'
    db.commit()
    
    # Queue sequential deployment task for the workshop
    attendees = db.query(Attendee).filter(Attendee.workshop_id == workshop_id).all()
    
    # Import here to avoid circular imports
    from tasks.terraform_tasks import deploy_workshop_attendees_sequential
    task = deploy_workshop_attendees_sequential.delay(str(workshop_id))
    
    return {
        "message": "Workshop sequential deployment started",
        "task_id": task.id,
        "attendee_count": len(attendees),
        "deployment_type": "sequential"
    }

@router.delete("/{workshop_id}/resources")
async def cleanup_workshop_resources(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Manual cleanup of workshop resources."""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Update workshop status
    workshop.status = 'deleting'
    db.commit()
    
    # Queue cleanup tasks for all attendees
    attendees = db.query(Attendee).filter(Attendee.workshop_id == workshop_id).all()
    
    task_ids = []
    for attendee in attendees:
        if attendee.status in ['active', 'failed']:
            # Import here to avoid circular imports
            from tasks.terraform_tasks import destroy_attendee_resources
            task = destroy_attendee_resources.delay(str(attendee.id))
            task_ids.append(task.id)
    
    return {
        "message": "Workshop cleanup started",
        "task_ids": task_ids,
        "attendee_count": len([a for a in attendees if a.status in ['active', 'failed']])
    }
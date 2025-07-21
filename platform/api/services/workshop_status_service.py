"""
Workshop status service for managing status aggregation logic.

This service implements the "least sane" status logic where workshop status 
reflects the worst status among all its attendees.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from models.workshop import Workshop
from models.attendee import Attendee

class WorkshopStatusService:
    """Service for managing workshop status based on attendee statuses."""
    
    # Status priority mapping (lower number = worse status)
    ATTENDEE_STATUS_PRIORITY = {
        'failed': 1,      # Worst - deployment failed
        'deleting': 2,    # Resources being cleaned up  
        'deploying': 3,   # In progress deployment
        'planning': 4,    # Not yet deployed
        'active': 5,      # Successfully deployed
        'deleted': 999,   # Ignored in aggregation
    }
    
    # Mapping from attendee status to workshop status
    STATUS_MAPPING = {
        'failed': 'failed',
        'deleting': 'deleting',
        'deploying': 'deploying', 
        'planning': 'planning',
        'active': 'active',
    }
    
    @classmethod
    def calculate_workshop_status_from_attendees(cls, attendee_statuses: List[str]) -> str:
        """
        Calculate workshop status based on the "least sane" (worst) attendee status.
        
        Args:
            attendee_statuses: List of attendee status strings
            
        Returns:
            Workshop status string based on worst attendee status
        """
        if not attendee_statuses:
            return 'planning'  # Empty workshop is in planning state
        
        # Filter out deleted attendees from consideration
        active_statuses = [status for status in attendee_statuses if status != 'deleted']
        
        if not active_statuses:
            return 'completed'  # All attendees deleted means workshop completed
        
        # Find the worst status based on priority
        worst_status = min(
            active_statuses, 
            key=lambda status: cls.ATTENDEE_STATUS_PRIORITY.get(status, 999)
        )
        
        # Map attendee status to workshop status
        return cls.STATUS_MAPPING.get(worst_status, 'planning')
    
    @classmethod
    def update_workshop_status_from_attendees(cls, workshop_id: str, db: Session) -> Optional[str]:
        """
        Update a workshop's status based on its attendees' statuses.
        
        Args:
            workshop_id: The workshop ID to update
            db: Database session
            
        Returns:
            The new workshop status, or None if workshop not found
        """
        # Get the workshop
        workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
        if not workshop:
            return None
        
        # Get all attendee statuses for this workshop
        attendees = db.query(Attendee).filter(Attendee.workshop_id == workshop_id).all()
        attendee_statuses = [attendee.status for attendee in attendees]
        
        # Calculate new status
        new_status = cls.calculate_workshop_status_from_attendees(attendee_statuses)
        
        # Update workshop status if it changed
        if workshop.status != new_status:
            workshop.status = new_status
            db.commit()
            print(f"Workshop {workshop_id} status updated from '{workshop.status}' to '{new_status}' based on attendees: {attendee_statuses}")
        
        return new_status
    
    @classmethod
    def get_status_priority(cls, status: str) -> int:
        """Get the priority value for a status (lower = worse)."""
        return cls.ATTENDEE_STATUS_PRIORITY.get(status, 999)
    
    @classmethod
    def is_status_worse_than(cls, status1: str, status2: str) -> bool:
        """Check if status1 is worse (lower priority) than status2."""
        return cls.get_status_priority(status1) < cls.get_status_priority(status2)
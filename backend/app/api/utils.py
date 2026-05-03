from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.collaboration import Collaboration


def accepted_count(db: Session, collaboration_id: int) -> int:
    return (
        db.query(func.count(Application.id))
        .filter(
            Application.collaboration_id == collaboration_id,
            Application.status == ApplicationStatus.accepted,
        )
        .scalar()
        or 0
    )


def serialize_collaboration(db: Session, collaboration: Collaboration, skill_match_count: int = 0) -> dict:
    accepted = accepted_count(db, collaboration.id)
    available = max(collaboration.slots - accepted, 0)
    return {
        "id": collaboration.id,
        "title": collaboration.title,
        "post_type": collaboration.post_type,
        "description": collaboration.description,
        "required_skills": collaboration.required_skills,
        "slots": collaboration.slots,
        "event_datetime": collaboration.event_datetime,
        "accepted_count": accepted,
        "slots_available": available,
        "is_full": available == 0,
        "skill_match_count": skill_match_count,
        "owner": collaboration.owner,
        "created_at": collaboration.created_at,
    }


def slot_payload(db: Session, collaboration: Collaboration) -> dict:
    accepted = accepted_count(db, collaboration.id)
    available = max(collaboration.slots - accepted, 0)
    return {
        "collaboration_id": collaboration.id,
        "accepted_count": accepted,
        "slots_available": available,
        "is_full": available == 0,
    }

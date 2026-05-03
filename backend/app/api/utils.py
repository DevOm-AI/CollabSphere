from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.groq import generate_match_reason
from app.models.application import Application, ApplicationStatus
from app.models.collaboration import Collaboration
from app.models.user import User


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


def collaboration_match(user: User | None, collaboration: Collaboration) -> tuple[int | None, str | None, int]:
    required_skills = collaboration.required_skill_records
    if not required_skills:
        return None, None, 0
    if user is None:
        return None, None, 0

    user_skill_ids = {skill.id for skill in user.skill_records}
    required_skill_ids = {skill.id for skill in required_skills}
    matched_skill_records = [skill for skill in required_skills if skill.id in user_skill_ids]
    match_count = len({skill.id for skill in matched_skill_records})
    match_score = round((match_count / len(required_skill_ids)) * 100)
    if match_score < 60:
        return match_score, None, match_count

    match_reason = generate_match_reason(
        matched_skills=[skill.name for skill in matched_skill_records],
        collaboration_title=collaboration.title,
        required_skills=[skill.name for skill in required_skills],
    )
    return match_score, match_reason, match_count


def serialize_collaboration(
    db: Session,
    collaboration: Collaboration,
    current_user: User | None = None,
    skill_match_count: int | None = None,
) -> dict:
    accepted = accepted_count(db, collaboration.id)
    available = max(collaboration.slots - accepted, 0)
    match_score, match_reason, computed_skill_match_count = collaboration_match(current_user, collaboration)
    return {
        "id": collaboration.id,
        "title": collaboration.title,
        "post_type": collaboration.post_type,
        "description": collaboration.description,
        "required_skills": collaboration.required_skills,
        "slots": collaboration.slots,
        "event_datetime": collaboration.event_datetime,
        "post_status": collaboration.post_status,
        "archived_at": collaboration.archived_at,
        "is_archived": collaboration.post_status == "Archived",
        "accepted_count": accepted,
        "slots_available": available,
        "is_full": available == 0,
        "skill_match_count": computed_skill_match_count if skill_match_count is None else skill_match_count,
        "match_score": match_score,
        "match_reason": match_reason,
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

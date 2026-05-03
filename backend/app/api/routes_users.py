from collections import Counter

from fastapi import APIRouter, Depends, HTTPException

from app.api.collaboration_lifecycle import POST_STATUS_ARCHIVED, archive_expired_collaborations
from app.api.deps import get_current_user
from app.api.skills import set_user_skills
from app.api.utils import serialize_collaboration
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.application import Application, ApplicationStatus
from app.models.collaboration import Collaboration
from app.models.user import User
from app.schemas.collaboration import JoinedCollaborationRead, ProfilePortfolioRead
from app.schemas.user import PasswordChange, ProfileUpdate, UserRead
from sqlalchemy.orm import Session, joinedload, selectinload

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    skills = update_data.pop("skills", None)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    if skills is not None:
        set_user_skills(db, current_user, skills)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated"}


@router.get("/me/collaborations", response_model=list[JoinedCollaborationRead])
def my_joined_collaborations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    archive_expired_collaborations(db)
    applications = (
        db.query(Application)
        .options(
            joinedload(Application.collaboration).joinedload(Collaboration.owner),
            joinedload(Application.applicant),
        )
        .filter(Application.applicant_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return [
        {
            "application_id": application.id,
            "status": application.status,
            "offered_skills": application.offered_skills,
            "collaboration": serialize_collaboration(db, application.collaboration),
        }
        for application in applications
    ]


def portfolio_headline(name: str, counts: Counter[str]) -> str:
    total = sum(counts.values())
    if total == 0:
        return f"{name} has no archived collaborations yet."

    parts = []
    for post_type, count in counts.most_common():
        label = portfolio_type_label(post_type, count)
        parts.append(f"{count} {label}")

    if len(parts) == 1:
        summary = parts[0]
    else:
        summary = f"{', '.join(parts[:-1])} and {parts[-1]}"
    return f"{name} collaborated on {summary}."


def portfolio_type_label(post_type: str, count: int) -> str:
    normalized = post_type.strip().lower()
    if normalized == "research":
        return "research project" if count == 1 else "research projects"
    if count == 1:
        return normalized
    if normalized.endswith("s"):
        return normalized
    return f"{normalized}s"


def item_completed_timestamp(item: dict) -> float:
    completed_at = item["completed_at"] or item["collaboration"]["created_at"]
    return completed_at.timestamp()


@router.get("/me/portfolio", response_model=ProfilePortfolioRead)
def my_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    archive_expired_collaborations(db)

    accepted_applications = (
        db.query(Application)
        .options(
            joinedload(Application.collaboration).joinedload(Collaboration.owner),
        )
        .join(Collaboration, Application.collaboration_id == Collaboration.id)
        .filter(
            Application.applicant_id == current_user.id,
            Application.status == ApplicationStatus.accepted,
            Collaboration.post_status == POST_STATUS_ARCHIVED,
        )
        .all()
    )
    owned_collaborations = (
        db.query(Collaboration)
        .options(joinedload(Collaboration.owner), selectinload(Collaboration.required_skill_records))
        .filter(
            Collaboration.owner_id == current_user.id,
            Collaboration.post_status == POST_STATUS_ARCHIVED,
        )
        .all()
    )

    items = [
        {
            "role": "Collaborator",
            "completed_at": application.collaboration.event_datetime or application.collaboration.archived_at,
            "offered_skills": application.offered_skills,
            "collaboration": serialize_collaboration(db, application.collaboration),
        }
        for application in accepted_applications
    ]
    items.extend(
        {
            "role": "Creator",
            "completed_at": collaboration.event_datetime or collaboration.archived_at,
            "offered_skills": [],
            "collaboration": serialize_collaboration(db, collaboration),
        }
        for collaboration in owned_collaborations
    )
    items.sort(key=item_completed_timestamp, reverse=True)

    counts = Counter(item["collaboration"]["post_type"] for item in items)
    return {
        "headline": portfolio_headline(current_user.name, counts),
        "summary": [{"post_type": post_type, "count": count} for post_type, count in counts.most_common()],
        "items": items,
    }

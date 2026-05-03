from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.api.utils import serialize_collaboration
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.application import Application
from app.models.collaboration import Collaboration
from app.models.user import User
from app.schemas.collaboration import JoinedCollaborationRead
from app.schemas.user import PasswordChange, ProfileUpdate, UserRead
from sqlalchemy.orm import Session, joinedload

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
    for field, value in update_data.items():
        setattr(current_user, field, value)
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

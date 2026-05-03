from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.utils import accepted_count, serialize_collaboration, slot_payload
from app.core.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.collaboration import Collaboration
from app.models.user import User
from app.realtime import manager
from app.schemas.collaboration import (
    ApplicationCreate,
    ApplicationDecision,
    ApplicationRead,
    CollaborationCreate,
    CollaborationRead,
    CollaborationUpdate,
    JoinedCollaborationRead,
)

router = APIRouter(prefix="/collaborations", tags=["collaborations"])


@router.get("", response_model=list[CollaborationRead])
def list_collaborations(db: Session = Depends(get_db)) -> list[dict]:
    collaborations = (
        db.query(Collaboration)
        .options(joinedload(Collaboration.owner))
        .order_by(Collaboration.created_at.desc())
        .all()
    )
    return [serialize_collaboration(db, collaboration) for collaboration in collaborations]


@router.post("", response_model=CollaborationRead, status_code=status.HTTP_201_CREATED)
def create_collaboration(
    payload: CollaborationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    collaboration = Collaboration(
        title=payload.title,
        post_type=payload.post_type,
        description=payload.description,
        required_skills=payload.required_skills,
        slots=payload.slots,
        event_datetime=payload.event_datetime,
        owner_id=current_user.id,
    )
    db.add(collaboration)
    db.commit()
    db.refresh(collaboration)
    return serialize_collaboration(db, collaboration)


@router.get("/me/joined", response_model=list[JoinedCollaborationRead])
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


@router.get("/{collaboration_id}", response_model=CollaborationRead)
def get_collaboration(collaboration_id: int, db: Session = Depends(get_db)) -> dict:
    collaboration = (
        db.query(Collaboration)
        .options(joinedload(Collaboration.owner))
        .filter(Collaboration.id == collaboration_id)
        .first()
    )
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    return serialize_collaboration(db, collaboration)


@router.put("/{collaboration_id}", response_model=CollaborationRead)
async def update_collaboration(
    collaboration_id: int,
    payload: CollaborationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    collaboration = (
        db.query(Collaboration)
        .options(joinedload(Collaboration.owner))
        .filter(Collaboration.id == collaboration_id)
        .first()
    )
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can modify this post")

    update_data = payload.model_dump(exclude_unset=True)
    if "slots" in update_data and update_data["slots"] is not None:
        if update_data["slots"] < accepted_count(db, collaboration_id):
            raise HTTPException(status_code=400, detail="Slots cannot be lower than accepted teammates")

    for field, value in update_data.items():
        setattr(collaboration, field, value)

    db.commit()
    db.refresh(collaboration)
    await manager.broadcast_slots(collaboration_id, slot_payload(db, collaboration))
    return serialize_collaboration(db, collaboration)


@router.delete("/{collaboration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collaboration(
    collaboration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    collaboration = db.get(Collaboration, collaboration_id)
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this post")

    db.delete(collaboration)
    db.commit()


@router.post("/{collaboration_id}/apply", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def apply_to_collaboration(
    collaboration_id: int,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Application:
    collaboration = db.get(Collaboration, collaboration_id)
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owners cannot apply to their own collaboration")
    if accepted_count(db, collaboration_id) >= collaboration.slots:
        raise HTTPException(status_code=400, detail="Collaboration is full")

    existing = (
        db.query(Application)
        .filter(
            Application.collaboration_id == collaboration_id,
            Application.applicant_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied")

    application = Application(
        collaboration_id=collaboration_id,
        applicant_id=current_user.id,
        message=payload.message,
        offered_skills=payload.offered_skills,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/{collaboration_id}/applications", response_model=list[ApplicationRead])
def list_applications(
    collaboration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Application]:
    collaboration = db.get(Collaboration, collaboration_id)
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can view applicants")

    return (
        db.query(Application)
        .options(joinedload(Application.applicant))
        .filter(Application.collaboration_id == collaboration_id)
        .order_by(Application.created_at.desc())
        .all()
    )


@router.patch("/{collaboration_id}/applications/{application_id}", response_model=ApplicationRead)
async def decide_application(
    collaboration_id: int,
    application_id: int,
    payload: ApplicationDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Application:
    collaboration = db.get(Collaboration, collaboration_id)
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can decide applicants")

    application = (
        db.query(Application)
        .options(joinedload(Application.applicant))
        .filter(
            Application.id == application_id,
            Application.collaboration_id == collaboration_id,
        )
        .first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.status == ApplicationStatus.accepted and application.status != ApplicationStatus.accepted:
        if accepted_count(db, collaboration_id) >= collaboration.slots:
            raise HTTPException(status_code=400, detail="No slots available")

    application.status = payload.status
    db.commit()
    db.refresh(application)
    await manager.broadcast_slots(collaboration_id, slot_payload(db, collaboration))
    return application

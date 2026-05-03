from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.collaboration_lifecycle import (
    POST_STATUS_ARCHIVED,
    POST_STATUS_OPEN,
    apply_post_lifecycle,
    archive_expired_collaborations,
)
from app.api.deps import get_current_user, get_optional_current_user
from app.api.skills import set_collaboration_required_skills
from app.api.utils import accepted_count, serialize_collaboration, slot_payload
from app.core.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.collaboration import Collaboration
from app.models.skill import collaboration_required_skills
from app.models.user import User
from app.realtime import manager
from app.schemas.collaboration import (
    ApplicationCreate,
    ApplicationDecision,
    ApplicationRead,
    CollaborationCreate,
    CollaborationRead,
    CollaborationUpdate,
)

router = APIRouter(prefix="/collaborations", tags=["collaborations"])


@router.get("", response_model=list[CollaborationRead])
def list_collaborations(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    post_status: str = Query(default=POST_STATUS_OPEN, pattern="^(Open|Archived|All)$"),
    match_my_skills: bool = Query(default=False),
    min_skill_matches: int = Query(default=1, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> list[dict]:
    archive_expired_collaborations(db)
    query = db.query(Collaboration).options(
        joinedload(Collaboration.owner),
        selectinload(Collaboration.required_skill_records),
    )
    matched_skill_ids: set[int] = set()

    if post_status != "All":
        query = query.filter(Collaboration.post_status == post_status)

    if match_my_skills:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Skill matching requires authentication")

        matched_skill_ids = {skill.id for skill in current_user.skill_records}
        if not matched_skill_ids:
            return []

        skill_matches = (
            db.query(
                collaboration_required_skills.c.collaboration_id,
                func.count(func.distinct(collaboration_required_skills.c.skill_id)).label("skill_match_count"),
            )
            .filter(collaboration_required_skills.c.skill_id.in_(matched_skill_ids))
            .group_by(collaboration_required_skills.c.collaboration_id)
            .having(func.count(func.distinct(collaboration_required_skills.c.skill_id)) >= min_skill_matches)
            .subquery()
        )
        query = query.join(skill_matches, Collaboration.id == skill_matches.c.collaboration_id).order_by(
            skill_matches.c.skill_match_count.desc(),
            Collaboration.created_at.desc(),
        )
    else:
        query = query.order_by(Collaboration.created_at.desc())

    collaborations = query.offset(offset).limit(limit).all()
    return [
        serialize_collaboration(
            db,
            collaboration,
            skill_match_count=len({skill.id for skill in collaboration.required_skill_records} & matched_skill_ids),
        )
        for collaboration in collaborations
    ]


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
        slots=payload.slots,
        event_datetime=payload.event_datetime,
        owner_id=current_user.id,
    )
    apply_post_lifecycle(collaboration)
    db.add(collaboration)
    set_collaboration_required_skills(db, collaboration, payload.required_skills)
    db.commit()
    db.refresh(collaboration)
    return serialize_collaboration(db, collaboration)


@router.get("/{collaboration_id}", response_model=CollaborationRead)
def get_collaboration(collaboration_id: int, db: Session = Depends(get_db)) -> dict:
    archive_expired_collaborations(db)
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
        .filter(Collaboration.id == collaboration_id)
        .with_for_update()
        .first()
    )
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can modify this post")

    update_data = payload.model_dump(exclude_unset=True)
    required_skills = update_data.pop("required_skills", None)
    if "slots" in update_data and update_data["slots"] is not None:
        if update_data["slots"] < accepted_count(db, collaboration_id):
            raise HTTPException(status_code=400, detail="Slots cannot be lower than accepted teammates")

    for field, value in update_data.items():
        setattr(collaboration, field, value)
    if required_skills is not None:
        set_collaboration_required_skills(db, collaboration, required_skills)
    apply_post_lifecycle(collaboration)

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
    archive_expired_collaborations(db)
    collaboration = db.get(Collaboration, collaboration_id)
    if collaboration is None:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    if collaboration.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Owners cannot apply to their own collaboration")
    if collaboration.post_status == POST_STATUS_ARCHIVED:
        raise HTTPException(status_code=400, detail="Archived collaborations no longer accept applications")
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
    archive_expired_collaborations(db)
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
    archive_expired_collaborations(db)
    collaboration = (
        db.query(Collaboration)
        .filter(Collaboration.id == collaboration_id)
        .with_for_update()
        .first()
    )
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

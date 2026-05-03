import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.invite_code import InviteCode
from app.models.user import User
from app.schemas.invite import InviteCodeRead


router = APIRouter(prefix="/invite", tags=["invite"])


def generate_unique_code(db: Session) -> str:
    for _ in range(8):
        code = secrets.token_urlsafe(12)
        exists = db.query(InviteCode).filter(InviteCode.code == code).first()
        if exists is None:
            return code
    raise HTTPException(status_code=500, detail="Could not generate invite code")


@router.post("/generate", response_model=InviteCodeRead, status_code=status.HTTP_201_CREATED)
def generate_invite_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InviteCode:
    if not current_user.college:
        raise HTTPException(status_code=400, detail="Add a college to your profile before generating an invite code")

    existing_code = db.query(InviteCode).filter(InviteCode.college == current_user.college).first()
    if existing_code is not None:
        raise HTTPException(status_code=409, detail="An invite code already exists for this college")

    first_user = (
        db.query(User)
        .filter(User.college == current_user.college)
        .order_by(User.created_at.asc(), User.id.asc())
        .first()
    )
    if first_user is None or first_user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the first user from a college can generate its invite code")

    invite_code = InviteCode(
        college=current_user.college,
        code=generate_unique_code(db),
        created_by=current_user.id,
    )
    current_user.campus_rep = True
    current_user.college_verified = True
    db.add(invite_code)
    db.commit()
    db.refresh(invite_code)
    return invite_code

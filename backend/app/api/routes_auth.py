from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.colleges import canonical_college_name
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.invite_code import InviteCode
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)) -> User:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    college = canonical_college_name(payload.college)
    if college is None:
        raise HTTPException(status_code=400, detail="Select a valid college")

    college_verified = False
    invite_code = payload.invite_code.strip() if payload.invite_code else None
    if invite_code:
        invite = db.query(InviteCode).filter(InviteCode.code == invite_code).first()
        if invite is None or invite.college != college:
            raise HTTPException(status_code=400, detail="Invite code does not match the selected college")
        college_verified = True

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        college=college,
        college_verified=college_verified,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(access_token=create_access_token(str(user.id)))

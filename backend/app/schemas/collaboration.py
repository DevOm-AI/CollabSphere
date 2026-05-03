from datetime import datetime

from pydantic import BaseModel, Field

from app.models.application import ApplicationStatus
from app.schemas.user import UserRead


class CollaborationCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    post_type: str = Field(default="Event", min_length=2, max_length=80)
    description: str = Field(min_length=10)
    required_skills: list[str] = []
    slots: int = Field(gt=0, le=50)
    event_datetime: datetime | None = None


class CollaborationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    post_type: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, min_length=10)
    required_skills: list[str] | None = None
    slots: int | None = Field(default=None, gt=0, le=50)
    event_datetime: datetime | None = None


class CollaborationRead(BaseModel):
    id: int
    title: str
    post_type: str
    description: str
    required_skills: list[str]
    slots: int
    event_datetime: datetime | None
    post_status: str
    archived_at: datetime | None
    is_archived: bool
    accepted_count: int
    slots_available: int
    is_full: bool
    skill_match_count: int = 0
    owner: UserRead
    created_at: datetime


class ApplicationCreate(BaseModel):
    message: str | None = Field(default=None, max_length=1000)
    offered_skills: list[str] = []


class ApplicationDecision(BaseModel):
    status: ApplicationStatus


class ApplicationRead(BaseModel):
    id: int
    message: str | None
    offered_skills: list[str]
    status: ApplicationStatus
    applicant: UserRead
    collaboration_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinedCollaborationRead(BaseModel):
    application_id: int
    status: ApplicationStatus
    offered_skills: list[str]
    collaboration: CollaborationRead


class PortfolioSummaryItem(BaseModel):
    post_type: str
    count: int


class PortfolioItemRead(BaseModel):
    role: str
    completed_at: datetime | None
    offered_skills: list[str] = []
    collaboration: CollaborationRead


class ProfilePortfolioRead(BaseModel):
    headline: str
    summary: list[PortfolioSummaryItem]
    items: list[PortfolioItemRead]

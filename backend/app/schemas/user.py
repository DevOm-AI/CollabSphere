from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str
    email: EmailStr
    mobile_number: str | None = None
    department: str | None = None
    graduation_year: int | None = None
    portfolio_url: str | None = None
    email_notifications: bool = True
    skills: list[str] = []
    interests: list[str] = []
    contributions: list[str] = []


class UserRead(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    name: str | None = None
    mobile_number: str | None = None
    department: str | None = None
    graduation_year: int | None = None
    portfolio_url: str | None = None
    email_notifications: bool | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None
    contributions: list[str] | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)

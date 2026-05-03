from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.skill import user_skills


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    mobile_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    college: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    college_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    campus_rep: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    legacy_skills: Mapped[list[str]] = mapped_column("skills", ARRAY(String), default=list, nullable=False)
    interests: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    contributions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    collaborations = relationship("Collaboration", back_populates="owner", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete-orphan")
    invite_codes = relationship("InviteCode", back_populates="creator", cascade="all, delete-orphan")
    skill_records = relationship(
        "Skill",
        secondary=user_skills,
        back_populates="users",
        order_by="Skill.name",
    )

    @property
    def skills(self) -> list[str]:
        if self.skill_records:
            return [skill.name for skill in self.skill_records]
        return self.legacy_skills or []

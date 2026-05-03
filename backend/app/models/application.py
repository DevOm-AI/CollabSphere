import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("collaboration_id", "applicant_id", name="uq_collaboration_applicant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    collaboration_id: Mapped[int] = mapped_column(ForeignKey("collaborations.id", ondelete="CASCADE"))
    applicant_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    offered_skills: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"),
        default=ApplicationStatus.pending,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    collaboration = relationship("Collaboration", back_populates="applications")
    applicant = relationship("User", back_populates="applications")

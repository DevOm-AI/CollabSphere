from sqlalchemy import Column, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


user_skills = Table(
    "user_skills",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)


collaboration_required_skills = Table(
    "collaboration_required_skills",
    Base.metadata,
    Column("collaboration_id", ForeignKey("collaborations.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("canonical_name", name="uq_skills_canonical_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    canonical_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)

    users = relationship("User", secondary=user_skills, back_populates="skill_records")
    collaborations = relationship(
        "Collaboration",
        secondary=collaboration_required_skills,
        back_populates="required_skill_records",
    )

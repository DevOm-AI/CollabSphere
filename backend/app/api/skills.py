from sqlalchemy.orm import Session

from app.models.collaboration import Collaboration
from app.models.skill import Skill
from app.models.user import User


def normalize_skill_name(value: str) -> str | None:
    name = " ".join(value.strip().split())
    return name or None


def normalize_skill_names(values: list[str] | None) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        name = normalize_skill_name(value)
        if name is None:
            continue
        canonical = canonical_skill_name(name)
        if canonical in seen:
            continue
        names.append(name)
        seen.add(canonical)
    return names


def canonical_skill_name(value: str) -> str:
    return value.casefold()


def get_or_create_skill(db: Session, name: str) -> Skill:
    canonical = canonical_skill_name(name)
    skill = db.query(Skill).filter(Skill.canonical_name == canonical).first()
    if skill is not None:
        return skill

    skill = Skill(name=name, canonical_name=canonical)
    db.add(skill)
    db.flush()
    return skill


def set_user_skills(db: Session, user: User, names: list[str] | None) -> None:
    normalized_names = normalize_skill_names(names)
    user.skill_records = [get_or_create_skill(db, name) for name in normalized_names]
    user.legacy_skills = normalized_names


def set_collaboration_required_skills(
    db: Session,
    collaboration: Collaboration,
    names: list[str] | None,
) -> None:
    normalized_names = normalize_skill_names(names)
    collaboration.required_skill_records = [get_or_create_skill(db, name) for name in normalized_names]
    collaboration.legacy_required_skills = normalized_names

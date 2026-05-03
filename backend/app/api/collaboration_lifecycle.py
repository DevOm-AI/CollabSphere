from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.collaboration import Collaboration


POST_STATUS_OPEN = "Open"
POST_STATUS_ARCHIVED = "Archived"


def archive_expired_collaborations(db: Session) -> int:
    now = datetime.now(timezone.utc)
    archived = (
        db.query(Collaboration)
        .filter(
            Collaboration.post_status == POST_STATUS_OPEN,
            Collaboration.event_datetime.isnot(None),
            Collaboration.event_datetime < now,
        )
        .update(
            {
                Collaboration.post_status: POST_STATUS_ARCHIVED,
                Collaboration.archived_at: now,
            },
            synchronize_session=False,
        )
    )
    if archived:
        db.commit()
    return archived


def now_for(value: datetime) -> datetime:
    if value.tzinfo is None:
        return datetime.now()
    return datetime.now(value.tzinfo)


def apply_post_lifecycle(collaboration: Collaboration) -> None:
    if collaboration.event_datetime is None:
        collaboration.post_status = POST_STATUS_OPEN
        collaboration.archived_at = None
        return

    if collaboration.event_datetime < now_for(collaboration.event_datetime):
        collaboration.post_status = POST_STATUS_ARCHIVED
        collaboration.archived_at = collaboration.archived_at or datetime.now(timezone.utc)
    else:
        collaboration.post_status = POST_STATUS_OPEN
        collaboration.archived_at = None

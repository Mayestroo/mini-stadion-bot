from sqlalchemy.orm import Session

from app.models.analytics import AnalyticsEvent


def track_event(
    db: Session,
    event_type: str,
    telegram_id: str | int | None = None,
    user_id: int | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AnalyticsEvent(
            event_type=event_type,
            telegram_id=str(telegram_id) if telegram_id is not None else None,
            user_id=user_id,
            metadata_json=metadata or {},
        )
    )

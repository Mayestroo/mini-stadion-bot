from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.models.analytics import AnalyticsEvent
from app.models.booking import Booking, BookingStatus
from app.models.moderation import (
    BookingCancelRequest,
    ModerationStatus,
    StadiumDraft,
    StadiumImageDraft,
)
from app.models.stadium import Stadium
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Superadmin"])


@router.get("/statistics")
def get_statistics(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    now = datetime.now(timezone.utc)
    starts = {
        "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "week": now - timedelta(days=7),
        "month": now - timedelta(days=30),
        "year": now - timedelta(days=365),
    }

    revenue_statuses = [BookingStatus.confirmed, BookingStatus.completed]

    revenue_query = (
        db.query(
            func.sum(Booking.total_price).label("total"),
            func.sum(case((User.telegram_id.isnot(None), Booking.total_price), else_=0)).label("bot_total"),
            *[
                func.sum(case((Booking.created_at >= start, Booking.total_price), else_=0)).label(key)
                for key, start in starts.items()
            ],
            *[
                func.sum(
                    case(
                        (and_(User.telegram_id.isnot(None), Booking.created_at >= start), Booking.total_price),
                        else_=0,
                    )
                ).label(f"bot_{key}")
                for key, start in starts.items()
            ],
        )
        .join(User, Booking.user_id == User.id)
        .filter(Booking.status.in_(revenue_statuses))
        .first()
    )
    revenue = {}
    for column in revenue_query._fields:
        revenue[column] = int(getattr(revenue_query, column) or 0)

    status_counts = (
        db.query(Booking.status, func.count(Booking.id))
        .group_by(Booking.status)
        .all()
    )
    booking_statuses = {s.value: c for s, c in status_counts}

    total_bookings = sum(booking_statuses.values())
    avg_price = (
        db.query(func.avg(Booking.total_price))
        .filter(Booking.status.in_(revenue_statuses))
        .scalar()
        or 0
    )
    average_booking_price = int(avg_price)

    bot_events_row = (
        db.query(
            *[
                func.sum(case((AnalyticsEvent.created_at >= start, 1), else_=0)).label(key)
                for key, start in starts.items()
            ]
        )
        .filter(AnalyticsEvent.event_type.in_(["bot_start", "miniapp_auth"]))
        .first()
    )
    bot_events = {}
    for column in bot_events_row._fields:
        bot_events[column] = getattr(bot_events_row, column) or 0

    unique_telegram_users = (
        db.query(func.count(func.distinct(AnalyticsEvent.telegram_id)))
        .filter(AnalyticsEvent.telegram_id.isnot(None))
        .scalar()
        or 0
    )

    conversion_row = (
        db.query(
            func.sum(case((AnalyticsEvent.event_type == "bot_start", 1), else_=0)).label("bot_start"),
            func.sum(case((AnalyticsEvent.event_type.in_(["bot_save_phone", "miniapp_auth"]), 1), else_=0)).label("phone_or_auth"),
            func.sum(case((AnalyticsEvent.event_type == "booking_created", 1), else_=0)).label("booking_created"),
        )
        .first()
    )
    conversion = {
        "bot_start": conversion_row.bot_start or 0,
        "phone_or_auth": conversion_row.phone_or_auth or 0,
        "booking_created": conversion_row.booking_created or 0,
    }

    new_users_row = (
        db.query(
            *[
                func.sum(case((User.created_at >= start, 1), else_=0)).label(key)
                for key, start in starts.items()
            ]
        )
        .first()
    )
    new_users = {}
    for column in new_users_row._fields:
        new_users[column] = getattr(new_users_row, column) or 0

    top_by_bookings = [
        {"stadium_id": row.stadium_id, "name": row.name, "bookings": row.bookings}
        for row in db.query(Stadium.id.label("stadium_id"), Stadium.name, func.count(Booking.id).label("bookings"))
        .join(Booking, Booking.stadium_id == Stadium.id)
        .group_by(Stadium.id, Stadium.name)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
        .all()
    ]
    top_by_revenue = [
        {"stadium_id": row.stadium_id, "name": row.name, "revenue": int(row.revenue or 0)}
        for row in db.query(Stadium.id.label("stadium_id"), Stadium.name, func.sum(Booking.total_price).label("revenue"))
        .join(Booking, Booking.stadium_id == Stadium.id)
        .filter(Booking.status.in_(revenue_statuses))
        .group_by(Stadium.id, Stadium.name)
        .order_by(func.sum(Booking.total_price).desc())
        .limit(10)
        .all()
    ]

    pending_moderation = {
        "stadium_drafts": db.query(StadiumDraft).filter(StadiumDraft.status == ModerationStatus.pending).count(),
        "image_drafts": db.query(StadiumImageDraft).filter(StadiumImageDraft.status == ModerationStatus.pending).count(),
        "cancel_requests": db.query(BookingCancelRequest).filter(BookingCancelRequest.status == ModerationStatus.pending).count(),
    }

    return {
        "revenue": revenue,
        "booking_statuses": booking_statuses,
        "total_bookings": total_bookings,
        "average_booking_price": average_booking_price,
        "bot_events": bot_events,
        "unique_telegram_users": unique_telegram_users,
        "new_users": new_users,
        "conversion": conversion,
        "top_by_bookings": top_by_bookings,
        "top_by_revenue": top_by_revenue,
        "pending_moderation": pending_moderation,
    }

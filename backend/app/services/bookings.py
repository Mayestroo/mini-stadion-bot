import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.analytics import track_event
from app.core.telegram import send_booking_action_message
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.stadium import Stadium
from app.models.user import User
from app.schemas.booking import BookingCreate
from app.services.notifications import notify_admins, notify_user
from app.services.pricing import calculate_price, time_to_minutes


def generate_booking_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "AF-" + "".join(secrets.choice(alphabet) for _ in range(8))


def validate_booking_time(stadium: Stadium, booking_data: BookingCreate) -> None:
    try:
        booking_date = datetime.strptime(booking_data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Sana noto'g'ri")

    start_minutes = time_to_minutes(booking_data.start_time)
    end_minutes = time_to_minutes(booking_data.end_time)
    open_minutes = time_to_minutes(stadium.open_time)
    close_minutes = time_to_minutes(stadium.close_time)

    if end_minutes <= start_minutes:
        raise HTTPException(status_code=400, detail="Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak")
    if start_minutes < open_minutes or end_minutes > close_minutes:
        raise HTTPException(status_code=400, detail="Tanlangan vaqt stadion ish vaqtidan tashqarida")

    now = datetime.now(timezone(timedelta(hours=5)))
    if booking_date < now.date():
        raise HTTPException(status_code=400, detail="O'tgan sanaga bron qilish mumkin emas")

    if booking_date == now.date():
        booking_start = datetime.combine(booking_date, datetime.strptime(booking_data.start_time, "%H:%M").time(), tzinfo=now.tzinfo)
        if booking_start - now < timedelta(minutes=10):
            raise HTTPException(status_code=400, detail="Bron vaqtiga kamida 10 daqiqa qolgan bo'lishi kerak")


def create_booking(db: Session, current_user: User, booking_data: BookingCreate) -> Booking:
    # Lock the stadium row for the duration of the transaction so concurrent
    # booking requests for the same stadium are serialized. Without this,
    # overlapping ranges (e.g. 18:00-19:00 vs 18:30-19:30) both pass the
    # conflict check below and double-book.
    stadium_query = db.query(Stadium).filter(
        Stadium.id == booking_data.stadium_id,
        Stadium.is_active == True
    )
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        stadium_query = stadium_query.with_for_update()
    stadium = stadium_query.first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    validate_booking_time(stadium, booking_data)

    try:
        conflict = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(
            Booking.stadium_id == booking_data.stadium_id,
            Booking.date == booking_data.date,
            Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
            Booking.start_time < booking_data.end_time,
            Booking.end_time > booking_data.start_time,
        ).first()

        if conflict:
            raise HTTPException(status_code=409, detail="Bu vaqt allaqachon band qilingan")

        total_price, duration = calculate_price(
            stadium, booking_data.start_time, booking_data.end_time, booking_data.date
        )

        booking = Booking(
            booking_code=generate_booking_code(),
            user_id=current_user.id,
            stadium_id=booking_data.stadium_id,
            date=booking_data.date,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time,
            duration_hours=duration,
            total_price=total_price,
            note=booking_data.note,
        )
        db.add(booking)
        # Atomic SQL-level increment (avoids lost updates).
        adjust_total_bookings(db, stadium.id, +1)
        track_event(db, "booking_created", telegram_id=current_user.telegram_id, user_id=current_user.id, metadata={"stadium_id": stadium.id, "total_price": total_price})
        db.commit()
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bu vaqt allaqachon band qilingan")
    db.refresh(booking)

    notify_new_booking(db, booking)
    db.commit()

    return booking


def adjust_total_bookings(db: Session, stadium_id: int, delta: int) -> None:
    """Atomic SQL-level adjustment; clamps at zero."""
    db.query(Stadium).filter(Stadium.id == stadium_id).update(
        {
            Stadium.total_bookings: case(
                (func.coalesce(Stadium.total_bookings, 0) + delta < 0, 0),
                else_=func.coalesce(Stadium.total_bookings, 0) + delta,
            )
        },
        synchronize_session=False,
    )


def booking_summary(booking: Booking) -> str:
    return (
        f"Kod: {booking.booking_code}\n"
        f"Stadion: {booking.stadium.name}\n"
        f"Sana: {booking.date}\n"
        f"Vaqt: {booking.start_time}-{booking.end_time}\n"
        f"Narx: {booking.total_price:,} so'm"
    )


def notify_new_booking(db: Session, booking: Booking) -> None:
    message = (
        f"{booking_summary(booking)}\n"
        f"Foydalanuvchi: {booking.user.full_name}\n"
        f"Telefon: {booking.user.phone or '—'}"
    )
    if booking.note:
        message += f"\nIzoh: {booking.note}"
    notify_admins(db, "🆕 Yangi bron", message, NotificationType.booking)
    notify_user(db, booking.stadium.owner, "🆕 Yangi bron", message, NotificationType.booking, telegram=False)
    if booking.stadium.owner:
        send_booking_action_message(booking.stadium.owner.telegram_id, "🆕 Yangi bron", message, booking.id)


def notify_booking_status_changed(db: Session, booking: Booking) -> None:
    labels = {
        "pending": "kutilmoqda",
        "confirmed": "tasdiqlandi",
        "cancelled": "bekor qilindi",
        "completed": "yakunlandi",
        "no_show": "kelmadi",
    }
    notify_user(
        db,
        booking.user,
        "📌 Bron holati yangilandi",
        f"{booking_summary(booking)}\nHolat: {labels.get(booking.status.value, booking.status.value)}",
        NotificationType.booking,
    )

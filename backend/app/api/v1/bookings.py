from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import secrets
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.analytics import track_event
from app.core.dependencies import get_current_user, get_current_admin
from app.core.notifications import notify_user, notify_admins
from app.core.telegram import send_booking_action_message
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.stadium import Stadium
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingStatusUpdate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def generate_booking_code() -> str:
    import string
    alphabet = string.ascii_uppercase + string.digits
    return "AF-" + "".join(secrets.choice(alphabet) for _ in range(8))


def calculate_price(stadium: Stadium, start_time: str, end_time: str, date: str) -> tuple[int, int]:
    start_h = int(start_time.split(":")[0])
    end_h = int(end_time.split(":")[0])
    duration = end_h - start_h

    weekday = datetime.strptime(date, "%Y-%m-%d").weekday()
    is_weekend = weekday in [5, 6]

    is_night = start_h >= 20

    if is_weekend and stadium.price_weekend:
        price_per_hour = stadium.price_weekend
    elif is_night and stadium.price_night:
        price_per_hour = stadium.price_night
    else:
        price_per_hour = stadium.price_per_hour

    return price_per_hour * duration, duration


def time_to_minutes(value: str) -> int:
    hours, minutes = map(int, value.split(":"))
    return hours * 60 + minutes


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


@router.post("/", response_model=BookingResponse)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stadium = db.query(Stadium).filter(
        Stadium.id == booking_data.stadium_id,
        Stadium.is_active == True
    ).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    validate_booking_time(stadium, booking_data)

    conflict = db.query(Booking).filter(
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
    stadium.total_bookings += 1
    track_event(db, "booking_created", telegram_id=current_user.telegram_id, user_id=current_user.id, metadata={"stadium_id": stadium.id, "total_price": total_price})
    db.commit()
    db.refresh(booking)

    _notify_new_booking(db, booking)
    db.commit()

    return _booking_to_response(booking)


@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    return [_booking_to_response(b) for b in bookings]


@router.get("/admin/all", response_model=List[BookingResponse])
def get_all_bookings(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()
    return [_booking_to_response(b) for b in bookings]


@router.patch("/admin/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    update_data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")

    booking.status = update_data.status
    if update_data.admin_note:
        booking.admin_note = update_data.admin_note
    track_event(db, "moderator_booking_status_update", user_id=admin.id, metadata={"booking_id": booking.id, "status": update_data.status})
    db.commit()
    db.refresh(booking)
    _notify_booking_status_changed(db, booking)
    db.commit()
    return {"message": "Holat yangilandi", "status": update_data.status}


@router.get("/{booking_code}", response_model=BookingResponse)
def get_booking(
    booking_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.booking_code == booking_code).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id and current_user.role not in (UserRole.moderator, UserRole.superadmin):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return _booking_to_response(booking)


@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail="Bekor qilib bo'lmaydi")

    booking.status = BookingStatus.cancelled
    track_event(db, "booking_cancelled_by_user", telegram_id=current_user.telegram_id, user_id=current_user.id, metadata={"booking_id": booking.id})
    db.commit()
    db.refresh(booking)
    notify_admins(
        db,
        "❌ Bron bekor qilindi",
        f"{_booking_summary(booking)}\nFoydalanuvchi: {booking.user.full_name}",
        NotificationType.booking,
    )
    db.commit()
    return {"message": "Bron bekor qilindi"}


def _booking_summary(booking: Booking) -> str:
    return (
        f"Kod: {booking.booking_code}\n"
        f"Stadion: {booking.stadium.name}\n"
        f"Sana: {booking.date}\n"
        f"Vaqt: {booking.start_time}-{booking.end_time}\n"
        f"Narx: {booking.total_price:,} so'm"
    )


def _notify_new_booking(db: Session, booking: Booking) -> None:
    message = (
        f"{_booking_summary(booking)}\n"
        f"Foydalanuvchi: {booking.user.full_name}\n"
        f"Telefon: {booking.user.phone or '—'}"
    )
    if booking.note:
        message += f"\nIzoh: {booking.note}"
    notify_admins(db, "🆕 Yangi bron", message, NotificationType.booking)
    notify_user(db, booking.stadium.owner, "🆕 Yangi bron", message, NotificationType.booking, telegram=False)
    if booking.stadium.owner:
        send_booking_action_message(booking.stadium.owner.telegram_id, "🆕 Yangi bron", message, booking.id)


def _notify_booking_status_changed(db: Session, booking: Booking) -> None:
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
        f"{_booking_summary(booking)}\nHolat: {labels.get(booking.status.value, booking.status.value)}",
        NotificationType.booking,
    )


def _booking_to_response(b: Booking) -> BookingResponse:
    return BookingResponse(
        id=b.id,
        booking_code=b.booking_code,
        stadium_id=b.stadium_id,
        stadium_name=b.stadium.name,
        user_id=b.user_id,
        user_name=b.user.full_name,
        user_phone=b.user.phone,
        date=b.date,
        start_time=b.start_time,
        end_time=b.end_time,
        duration_hours=b.duration_hours,
        total_price=b.total_price,
        status=b.status.value,
        note=b.note,
        admin_note=b.admin_note,
        created_at=b.created_at,
    )

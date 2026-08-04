from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.analytics import track_event
from app.core.audit import write_audit
from app.core.dependencies import get_current_user, get_current_admin
from app.core.ratelimit import rate_limit
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingStatusUpdate, BookingResponse
from app.schemas.common import Page
from app.services.bookings import adjust_total_bookings, booking_summary, create_booking as create_booking_service, notify_booking_status_changed
from app.services.notifications import notify_admins

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/", response_model=BookingResponse, dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = create_booking_service(db, current_user, booking_data)
    return BookingResponse.from_model(booking)


@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).offset(skip).limit(min(limit, 100)).all()
    return [BookingResponse.from_model(b) for b in bookings]


@router.get("/admin/all", response_model=Page[BookingResponse])
def get_all_bookings(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    q: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user))
    if status:
        query = query.filter(Booking.status == status)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.join(User, Booking.user_id == User.id).filter(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                Booking.booking_code.ilike(pattern),
            )
        )
    # Booking.date is a YYYY-MM-DD string, so lexicographic range filters work.
    if date_from:
        query = query.filter(Booking.date >= date_from)
    if date_to:
        query = query.filter(Booking.date <= date_to)
    total = query.count()
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(min(limit, 100)).all()
    return {"items": [BookingResponse.from_model(b) for b in bookings], "total": total}


@router.patch("/admin/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    update_data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    booking = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")

    if update_data.status == BookingStatus.cancelled and booking.status != BookingStatus.cancelled:
        adjust_total_bookings(db, booking.stadium_id, -1)
    old_status = booking.status.value
    booking.status = update_data.status
    if update_data.admin_note:
        booking.admin_note = update_data.admin_note
    track_event(db, "moderator_booking_status_update", user_id=admin.id, metadata={"booking_id": booking.id, "status": update_data.status})
    write_audit(db, "booking_status_changed", admin, "booking", booking.id,
                {"from": old_status, "to": str(update_data.status), "admin_note": update_data.admin_note})
    db.commit()
    db.refresh(booking)
    notify_booking_status_changed(db, booking)
    db.commit()
    return {"message": "Holat yangilandi", "status": update_data.status}


@router.get("/{booking_code}", response_model=BookingResponse)
def get_booking(
    booking_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(Booking.booking_code == booking_code).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id and current_user.role not in (UserRole.moderator, UserRole.superadmin):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return BookingResponse.from_model(booking)


@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail="Bekor qilib bo'lmaydi")

    booking.status = BookingStatus.cancelled
    adjust_total_bookings(db, booking.stadium_id, -1)
    track_event(db, "booking_cancelled_by_user", telegram_id=current_user.telegram_id, user_id=current_user.id, metadata={"booking_id": booking.id})
    db.commit()
    db.refresh(booking)
    notify_admins(
        db,
        "❌ Bron bekor qilindi",
        f"{booking_summary(booking)}\nFoydalanuvchi: {booking.user.full_name}",
        NotificationType.booking,
    )
    db.commit()
    return {"message": "Bron bekor qilindi"}

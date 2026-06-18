from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import re

from app.core.database import get_db
from app.core.dependencies import get_current_admin, get_optional_user
from app.models.stadium import Stadium
from app.models.booking import Booking, BookingStatus
from app.models.user import User
from app.schemas.stadium import StadiumCreate, StadiumUpdate, StadiumResponse, AvailabilitySlot

router = APIRouter(prefix="/stadiums", tags=["Stadiums"])


def slot_has_minimum_lead_time(day: str, slot_time: str) -> bool:
    now = datetime.now(timezone(timedelta(hours=5)))
    try:
        slot_date = datetime.strptime(day, "%Y-%m-%d").date()
        slot_start = datetime.combine(slot_date, datetime.strptime(slot_time, "%H:%M").time(), tzinfo=now.tzinfo)
    except ValueError:
        return False
    return slot_start - now >= timedelta(minutes=10)


def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug


@router.get("/", response_model=List[StadiumResponse])
def get_stadiums(
    search: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    has_lighting: Optional[bool] = None,
    has_parking: Optional[bool] = None,
    featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Stadium).filter(Stadium.is_active == True)

    if search:
        query = query.filter(Stadium.name.ilike(f"%{search}%"))
    if district:
        query = query.filter(Stadium.district == district)
    if min_price:
        query = query.filter(Stadium.price_per_hour >= min_price)
    if max_price:
        query = query.filter(Stadium.price_per_hour <= max_price)
    if has_lighting is not None:
        query = query.filter(Stadium.has_lighting == has_lighting)
    if has_parking is not None:
        query = query.filter(Stadium.has_parking == has_parking)
    if featured:
        query = query.filter(Stadium.is_featured == True)

    stadiums = query.order_by(Stadium.is_featured.desc(), Stadium.rating.desc()).offset(skip).limit(limit).all()
    return stadiums


@router.get("/{stadium_id}/availability")
def get_availability(
    stadium_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Ma'lum kun uchun bo'sh vaqt slotlarini qaytaradi"""
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    bookings = db.query(Booking).filter(
        Booking.stadium_id == stadium_id,
        Booking.date == date,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
    ).all()

    booked_ranges = [(b.start_time, b.end_time, b.id) for b in bookings]

    slots = []
    open_h, open_m = map(int, stadium.open_time.split(":"))
    close_h, close_m = map(int, stadium.close_time.split(":"))

    for hour in range(open_h, close_h):
        slot_time = f"{hour:02d}:00"
        slot_end = f"{hour+1:02d}:00"
        available = True
        booking_id = None

        if not slot_has_minimum_lead_time(date, slot_time):
            available = False

        for start, end, bid in booked_ranges:
            if start <= slot_time < end:
                available = False
                booking_id = bid
                break

        slots.append(AvailabilitySlot(time=slot_time, available=available, booking_id=booking_id))

    return {"date": date, "stadium_id": stadium_id, "slots": slots}


@router.get("/{slug}", response_model=StadiumResponse)
def get_stadium(slug: str, db: Session = Depends(get_db)):
    stadium = db.query(Stadium).filter(Stadium.slug == slug, Stadium.is_active == True).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    return stadium


@router.post("/", response_model=StadiumResponse)
def create_stadium(
    stadium_data: StadiumCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    slug = generate_slug(stadium_data.name)
    base_slug = slug
    counter = 1
    while db.query(Stadium).filter(Stadium.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    stadium = Stadium(**stadium_data.model_dump(), slug=slug)
    db.add(stadium)
    db.commit()
    db.refresh(stadium)
    return stadium


@router.put("/{stadium_id}", response_model=StadiumResponse)
def update_stadium(
    stadium_id: int,
    stadium_data: StadiumUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    for field, value in stadium_data.model_dump(exclude_none=True).items():
        setattr(stadium, field, value)

    db.commit()
    db.refresh(stadium)
    return stadium


@router.delete("/{stadium_id}")
def delete_stadium(
    stadium_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    stadium.is_active = False
    db.commit()
    return {"message": "Stadion o'chirildi"}

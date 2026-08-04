from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_admin, get_current_superadmin, get_optional_user
from app.models.stadium import Stadium
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.schemas.stadium import ALLOWED_STADIUM_FIELDS, StadiumCreate, StadiumUpdate, StadiumResponse, AvailabilitySlot
from app.services.pricing import calculate_price
from app.services.slugs import generate_slug

router = APIRouter(prefix="/stadiums", tags=["Stadiums"])


def slot_has_minimum_lead_time(day: str, slot_time: str) -> bool:
    now = datetime.now(timezone(timedelta(hours=5)))
    try:
        slot_date = datetime.strptime(day, "%Y-%m-%d").date()
        slot_start = datetime.combine(slot_date, datetime.strptime(slot_time, "%H:%M").time(), tzinfo=now.tzinfo)
    except ValueError:
        return False
    return slot_start - now >= timedelta(minutes=10)


@router.get("/", response_model=List[StadiumResponse])
def get_stadiums(
    search: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    has_lighting: Optional[bool] = None,
    has_parking: Optional[bool] = None,
    featured: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
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

    booked_ranges = [(b.start_time, b.end_time) for b in bookings]

    slots = []
    open_h, open_m = map(int, stadium.open_time.split(":"))
    close_h, close_m = map(int, stadium.close_time.split(":"))

    for hour in range(open_h, close_h):
        slot_time = f"{hour:02d}:00"
        available = True

        if not slot_has_minimum_lead_time(date, slot_time):
            available = False

        for start, end in booked_ranges:
            if start <= slot_time < end:
                available = False
                break

        slots.append(AvailabilitySlot(time=slot_time, available=available))

    return {"date": date, "stadium_id": stadium_id, "slots": slots}


@router.get("/{stadium_id}/quote")
def get_price_quote(
    stadium_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    start_time: str = Query(..., description="HH:MM"),
    end_time: str = Query(..., description="HH:MM"),
    db: Session = Depends(get_db),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id, Stadium.is_active == True).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    total_price, duration_hours = calculate_price(stadium, start_time, end_time, date)
    return {
        "stadium_id": stadium_id,
        "date": date,
        "start_time": start_time,
        "end_time": end_time,
        "duration_hours": duration_hours,
        "total_price": total_price,
    }


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
    admin: User = Depends(get_current_superadmin),
):
    slug = generate_slug(stadium_data.name)
    base_slug = slug
    counter = 1
    while db.query(Stadium).filter(Stadium.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    stadium = Stadium(**{k: v for k, v in stadium_data.model_dump().items() if k in ALLOWED_STADIUM_FIELDS}, slug=slug, owner_id=admin.id)
    db.add(stadium)
    db.flush()  # assign stadium.id before the audit row references it
    write_audit(db, "stadium_created", admin, "stadium", stadium.id, {"name": stadium.name})
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
    if admin.role != UserRole.superadmin and stadium.owner_id != admin.id:
        raise HTTPException(status_code=403, detail="Faqat o'z stadioningizni tahrirlashingiz mumkin")

    ALLOWED_UPDATE_FIELDS = {
        "name", "description", "address", "district", "latitude", "longitude",
        "phone", "phone2", "telegram", "price_per_hour", "price_weekend", "price_night",
        "width", "length", "surface", "has_lighting", "has_changing_room", "has_shower",
        "has_parking", "has_cafe", "has_tribunes", "open_time", "close_time", "working_days",
        "cover_image", "images",
    }
    update_data = stadium_data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if field in ALLOWED_UPDATE_FIELDS:
            setattr(stadium, field, value)

    write_audit(db, "stadium_updated", admin, "stadium", stadium.id,
                {"fields": sorted(set(update_data) & ALLOWED_UPDATE_FIELDS)})
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
    if admin.role != UserRole.superadmin and stadium.owner_id != admin.id:
        raise HTTPException(status_code=403, detail="Faqat o'z stadioningizni o'chirishingiz mumkin")
    stadium.is_active = False
    write_audit(db, "stadium_deleted", admin, "stadium", stadium.id, {"name": stadium.name})
    db.commit()
    return {"message": "Stadion o'chirildi"}

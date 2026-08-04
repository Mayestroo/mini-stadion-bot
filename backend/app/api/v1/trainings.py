from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.analytics import track_event
from app.core.database import get_db
from app.core.dependencies import get_optional_user
from app.models.training import Training
from app.models.user import User
from app.schemas.training import TrainingResponse

router = APIRouter(prefix="/trainings", tags=["Trainings"])


@router.get("/", response_model=List[TrainingResponse])
def get_trainings(
    search: Optional[str] = None,
    sport: Optional[str] = None,
    district: Optional[str] = None,
    age_group: Optional[str] = None,
    stadium_id: Optional[int] = None,
    featured: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Training).filter(Training.is_active == True)

    if search:
        query = query.filter(Training.title.ilike(f"%{search}%"))
    if sport:
        query = query.filter(Training.sport == sport)
    if district:
        query = query.filter(Training.district == district)
    if stadium_id is not None:
        query = query.filter(Training.stadium_id == stadium_id)
    if age_group:
        query = query.filter(Training.age_group.in_([age_group, "all"]))
    if featured:
        query = query.filter(Training.is_featured == True)

    trainings = query.order_by(Training.is_featured.desc(), Training.created_at.desc()).offset(skip).limit(limit).all()
    return [TrainingResponse.from_model(t) for t in trainings]


@router.get("/{slug}", response_model=TrainingResponse)
def get_training(
    slug: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    training = db.query(Training).filter(Training.slug == slug, Training.is_active == True).first()
    if not training:
        raise HTTPException(status_code=404, detail="Mashg'ulot topilmadi")
    track_event(
        db,
        "training_view",
        telegram_id=user.telegram_id if user else None,
        user_id=user.id if user else None,
        metadata={"training_id": training.id, "sport": training.sport},
    )
    db.commit()
    return TrainingResponse.from_model(training)


@router.post("/{slug}/contact-click")
def track_contact_click(
    slug: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    training = db.query(Training).filter(Training.slug == slug, Training.is_active == True).first()
    if not training:
        raise HTTPException(status_code=404, detail="Mashg'ulot topilmadi")
    track_event(
        db,
        "training_contact_click",
        telegram_id=user.telegram_id if user else None,
        user_id=user.id if user else None,
        metadata={"training_id": training.id, "sport": training.sport},
    )
    db.commit()
    return {"message": "ok"}

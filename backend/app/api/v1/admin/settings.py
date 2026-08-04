from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.audit import write_audit
from app.core.database import get_db, utcnow
from app.core.dependencies import get_current_superadmin
from app.core.maintenance import invalidate_maintenance_cache
from app.core.ratelimit import rate_limit
from app.core.settings import SETTINGS_REGISTRY, list_settings, validate_setting_value
from app.models.settings import Setting
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Superadmin"])


class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str]
    kind: str
    updated_by: Optional[int]
    updated_at: Optional[datetime]


class SettingUpdate(BaseModel):
    value: str


@router.get("/settings", response_model=List[SettingResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_settings(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    items = list_settings(db)
    return [
        {
            "key": item.key,
            "value": item.value,
            "description": item.description,
            "kind": SETTINGS_REGISTRY[item.key][2],
            "updated_by": item.updated_by,
            "updated_at": item.updated_at,
        }
        for item in items
    ]


@router.patch("/settings/{key}", response_model=SettingResponse, dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    if key not in SETTINGS_REGISTRY:
        raise HTTPException(status_code=404, detail="Noma'lum sozlama")
    try:
        value = validate_setting_value(key, data.value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    old_value = None
    row = db.query(Setting).filter(Setting.key == key).first()
    if row is None:
        old_value = SETTINGS_REGISTRY[key][0]
        row = Setting(key=key, value=value, description=SETTINGS_REGISTRY[key][1])
        db.add(row)
    else:
        old_value = row.value
        row.value = value
    row.updated_by = superadmin.id
    row.updated_at = utcnow()

    write_audit(db, "setting_changed", superadmin, "setting", None, {"key": key, "from": old_value, "to": value})
    db.commit()
    db.refresh(row)

    if key == "maintenance_mode":
        invalidate_maintenance_cache()

    return {
        "key": row.key,
        "value": row.value,
        "description": row.description,
        "kind": SETTINGS_REGISTRY[row.key][2],
        "updated_by": row.updated_by,
        "updated_at": row.updated_at,
    }

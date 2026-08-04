from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/admin", tags=["Superadmin"])


@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    q: str | None = None,
    action: str | None = None,
    actor_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    limit = min(max(limit, 1), 200)
    query = db.query(AuditLog).options(joinedload(AuditLog.actor))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(AuditLog.action.ilike(pattern), AuditLog.entity_type.ilike(pattern)))
    if action:
        query = query.filter(AuditLog.action == action)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(date_to))
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_name": log.actor.full_name if log.actor else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at,
        }
        for log in logs
    ]

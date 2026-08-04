import csv
import io
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.ratelimit import rate_limit
from app.models.audit import AuditLog
from app.models.booking import Booking
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["Superadmin"])

MAX_EXPORT_ROWS = 10000


def _csv_response(filename: str, header: list[str], rows: list[list]) -> StreamingResponse:
    buffer = io.StringIO()
    buffer.write("﻿")  # UTF-8 BOM so Excel opens Cyrillic/Uzbek text correctly
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _date_filters(query, date_from: str | None, date_to: str | None):
    if date_from:
        query = query.filter(Booking.date >= date_from)
    if date_to:
        query = query.filter(Booking.date <= date_to)
    return query


@router.get("/export/bookings", dependencies=[Depends(rate_limit(max_requests=6, window_seconds=60))])
def export_bookings(
    q: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
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
    query = _date_filters(query, date_from, date_to)
    bookings = query.order_by(Booking.created_at.desc()).limit(MAX_EXPORT_ROWS).all()
    rows = [
        [
            b.booking_code,
            b.stadium.name,
            b.user.full_name,
            b.user.phone or "",
            b.date,
            f"{b.start_time}-{b.end_time}",
            b.total_price,
            b.status.value,
            b.created_at.isoformat() if b.created_at else "",
        ]
        for b in bookings
    ]
    return _csv_response(
        "bookings.csv",
        ["booking_code", "stadium", "user", "phone", "date", "time", "total_price", "status", "created_at"],
        rows,
    )


@router.get("/export/users", dependencies=[Depends(rate_limit(max_requests=6, window_seconds=60))])
def export_users(
    q: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(User)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.telegram_id.ilike(pattern),
                User.owner_login.ilike(pattern),
            )
        )
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=422, detail="Noto'g'ri rol")
    users = query.order_by(User.created_at.desc()).limit(MAX_EXPORT_ROWS).all()
    rows = [
        [
            u.id,
            u.full_name,
            u.phone or "",
            u.telegram_id or "",
            u.owner_login or "",
            u.role.value,
            "active" if u.is_active else "blocked",
            u.created_at.isoformat() if u.created_at else "",
        ]
        for u in users
    ]
    return _csv_response(
        "users.csv",
        ["id", "full_name", "phone", "telegram_id", "owner_login", "role", "status", "created_at"],
        rows,
    )


@router.get("/export/audit", dependencies=[Depends(rate_limit(max_requests=6, window_seconds=60))])
def export_audit(
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(AuditLog).options(joinedload(AuditLog.actor))
    try:
        if date_from:
            query = query.filter(AuditLog.created_at >= datetime.fromisoformat(date_from.strip()))
        if date_to:
            end = datetime.fromisoformat(date_to.strip())
            if len(date_to.strip()) == 10:
                end += timedelta(days=1)
            query = query.filter(AuditLog.created_at < end)
    except ValueError:
        raise HTTPException(status_code=422, detail="Sana noto'g'ri formatda (YYYY-MM-DD)")
    logs = query.order_by(AuditLog.created_at.desc()).limit(MAX_EXPORT_ROWS).all()
    rows = [
        [
            log.created_at.isoformat() if log.created_at else "",
            log.actor.full_name if log.actor else "System",
            log.action,
            log.entity_type or "",
            log.entity_id if log.entity_id is not None else "",
            json.dumps(log.metadata_json or {}, ensure_ascii=False),
        ]
        for log in logs
    ]
    return _csv_response(
        "audit.csv",
        ["created_at", "actor", "action", "entity_type", "entity_id", "metadata"],
        rows,
    )

from datetime import datetime, timezone

import pytest

from app.core.security import create_access_token, get_password_hash
from app.models.audit import AuditLog
from app.models.booking import Booking, BookingStatus
from app.models.stadium import Stadium
from app.models.user import User, UserRole


def _create_user(db_session, *, full_name, phone, role, is_active=True):
    user = User(
        full_name=full_name,
        phone=phone,
        hashed_password=get_password_hash("TestPass123!"),
        role=role,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _headers_for(user):
    # Mint tokens directly (auth/login is rate-limited per test session).
    return {"Authorization": f"Bearer {create_access_token({'sub': str(user.id)})}"}


@pytest.fixture
def superadmin(db_session):
    return _create_user(db_session, full_name="Super Admin", phone="+998909999999", role=UserRole.superadmin)


@pytest.fixture
def admin_headers(superadmin):
    return _headers_for(superadmin)


@pytest.fixture
def regular_user(db_session):
    return _create_user(db_session, full_name="Regular User", phone="+998901111111", role=UserRole.user)


# ---------- GET /admin/users ----------


def test_users_list_requires_auth(client):
    assert client.get("/api/v1/admin/users").status_code == 401


def test_users_list_forbidden_for_regular_user(client, regular_user):
    assert client.get("/api/v1/admin/users", headers=_headers_for(regular_user)).status_code == 403


def test_users_list_and_search(client, db_session, superadmin, admin_headers, regular_user):
    resp = client.get("/api/v1/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    names = [u["full_name"] for u in body["items"]]
    assert "Super Admin" in names and "Regular User" in names

    resp = client.get("/api/v1/admin/users", params={"q": "+998901111111"}, headers=admin_headers)
    assert [u["phone"] for u in resp.json()["items"]] == ["+998901111111"]
    assert resp.json()["total"] == 1

    resp = client.get("/api/v1/admin/users", params={"role": "user"}, headers=admin_headers)
    assert all(u["role"] == "user" for u in resp.json()["items"])

    assert client.get("/api/v1/admin/users", params={"role": "nope"}, headers=admin_headers).status_code == 422


# ---------- POST /admin/users/{id}/block ----------


def test_block_user_kills_sessions_and_unblocks(client, superadmin, admin_headers, regular_user):
    old_headers = _headers_for(regular_user)
    assert client.get("/api/v1/bookings/my", headers=old_headers).status_code == 200

    resp = client.post(f"/api/v1/admin/users/{regular_user.id}/block", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # Previously issued tokens must stop working immediately (token_version bump).
    blocked_probe = client.get("/api/v1/bookings/my", headers=old_headers)
    assert blocked_probe.status_code in (400, 401)

    resp = client.post(f"/api/v1/admin/users/{regular_user.id}/block", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True


def test_block_self_and_superadmin_rejected(client, db_session, superadmin, admin_headers):
    other_admin = _create_user(db_session, full_name="Second Admin", phone="+998903333333", role=UserRole.superadmin)
    assert client.post(f"/api/v1/admin/users/{superadmin.id}/block", headers=admin_headers).status_code == 400
    assert client.post(f"/api/v1/admin/users/{other_admin.id}/block", headers=admin_headers).status_code == 400
    assert client.post("/api/v1/admin/users/99999/block", headers=admin_headers).status_code == 404


def test_block_is_written_to_audit_log(client, db_session, superadmin, admin_headers, regular_user):
    client.post(f"/api/v1/admin/users/{regular_user.id}/block", headers=admin_headers)
    entry = db_session.query(AuditLog).filter(AuditLog.action == "user_blocked").first()
    assert entry is not None
    assert entry.actor_id == superadmin.id
    assert entry.entity_type == "user" and entry.entity_id == regular_user.id


# ---------- Audit log fixes ----------


def test_owner_created_audit_has_entity_id(client, db_session, superadmin, admin_headers):
    resp = client.post("/api/v1/admin/owners", headers=admin_headers, json={
        "full_name": "New Owner",
        "telegram_id": "555777",
        "owner_login": "owner_one",
        "temporary_password": "TempPass123",
    })
    assert resp.status_code == 200
    entry = db_session.query(AuditLog).filter(AuditLog.action == "owner_created").first()
    assert entry is not None
    assert entry.entity_id == resp.json()["id"]


def test_audit_rejects_invalid_date(client, admin_headers):
    resp = client.get("/api/v1/admin/audit", params={"date_from": "not-a-date"}, headers=admin_headers)
    assert resp.status_code == 422


def test_audit_date_to_includes_the_whole_day(client, db_session, admin_headers):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    resp = client.get("/api/v1/admin/audit", params={"date_to": today}, headers=admin_headers)
    assert resp.status_code == 200
    # The fixture setup itself created no audit rows, but today's rows must be
    # returned rather than cut off at 00:00 of the given day.
    assert all(row["created_at"][:10] == today for row in resp.json()["items"])


def test_audit_envelope_has_total(client, admin_headers, regular_user):
    client.post(f"/api/v1/admin/users/{regular_user.id}/block", headers=admin_headers)
    resp = client.get("/api/v1/admin/audit", headers=admin_headers)
    body = resp.json()
    assert body["total"] >= 1
    assert len(body["items"]) >= 1


def test_booking_status_change_is_audited(client, db_session, superadmin, admin_headers, regular_user):
    stadium = Stadium(owner_id=superadmin.id, name="Audit Arena", slug="audit-arena",
                      address="Toshkent", phone="+998901234567", price_per_hour=100000)
    db_session.add(stadium)
    db_session.commit()
    db_session.refresh(stadium)

    booking = Booking(
        booking_code="AUDIT1",
        user_id=regular_user.id,
        stadium_id=stadium.id,
        date="2099-01-01",
        start_time="10:00",
        end_time="11:00",
        duration_hours=1,
        total_price=100000,
        status=BookingStatus.pending,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)

    resp = client.patch(f"/api/v1/bookings/admin/{booking.id}/status",
                        headers=admin_headers, json={"status": "confirmed"})
    assert resp.status_code == 200

    entry = db_session.query(AuditLog).filter(AuditLog.action == "booking_status_changed").first()
    assert entry is not None
    assert entry.entity_id == booking.id
    assert entry.metadata_json["from"] == "pending" and entry.metadata_json["to"] == "confirmed"


def test_statistics_endpoint_smoke_and_cache(client, admin_headers):
    resp = client.get("/api/v1/admin/statistics", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "revenue" in body and "pending_moderation" in body
    # Cached second call returns the same payload shape.
    assert client.get("/api/v1/admin/statistics", headers=admin_headers).json() == body


# ---------- List filters ----------


def _make_booking(db_session, *, stadium_id, user_id, code, date, status=BookingStatus.pending):
    booking = Booking(
        booking_code=code,
        user_id=user_id,
        stadium_id=stadium_id,
        date=date,
        start_time="10:00",
        end_time="11:00",
        duration_hours=1,
        total_price=100000,
        status=status,
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking


def test_bookings_admin_envelope_and_filters(client, db_session, superadmin, admin_headers, regular_user):
    stadium = Stadium(owner_id=superadmin.id, name="Filter Arena", slug="filter-arena",
                      address="Toshkent", phone="+998901234567", price_per_hour=100000)
    db_session.add(stadium)
    db_session.commit()

    _make_booking(db_session, stadium_id=stadium.id, user_id=regular_user.id, code="FLT001", date="2026-08-01")
    _make_booking(db_session, stadium_id=stadium.id, user_id=regular_user.id, code="FLT002", date="2026-08-10",
                  status=BookingStatus.confirmed)

    resp = client.get("/api/v1/bookings/admin/all", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2 and len(body["items"]) == 2

    body = client.get("/api/v1/bookings/admin/all", params={"status": "confirmed"}, headers=admin_headers).json()
    assert body["total"] == 1 and body["items"][0]["booking_code"] == "FLT002"

    body = client.get("/api/v1/bookings/admin/all", params={"q": "FLT001"}, headers=admin_headers).json()
    assert body["total"] == 1 and body["items"][0]["booking_code"] == "FLT001"

    body = client.get("/api/v1/bookings/admin/all", params={"q": "Regular"}, headers=admin_headers).json()
    assert body["total"] == 2

    body = client.get("/api/v1/bookings/admin/all",
                      params={"date_from": "2026-08-05", "date_to": "2026-08-15"}, headers=admin_headers).json()
    assert body["total"] == 1 and body["items"][0]["booking_code"] == "FLT002"


def test_moderation_status_filter(client, db_session, superadmin, admin_headers):
    from app.models.moderation import ModerationStatus, StadiumDraft, StadiumDraftType

    owner = _create_user(db_session, full_name="Draft Owner", phone="+998904444444", role=UserRole.owner)
    for name, status in (("Pending One", ModerationStatus.pending), ("Done One", ModerationStatus.approved)):
        db_session.add(StadiumDraft(
            owner_id=owner.id, draft_type=StadiumDraftType.create, status=status,
            name=name, address="Toshkent", phone="+998901234567", price_per_hour=100000,
        ))
    db_session.commit()

    all_drafts = client.get("/api/v1/admin/moderation/stadium-drafts", headers=admin_headers).json()
    assert len(all_drafts) == 2

    pending = client.get("/api/v1/admin/moderation/stadium-drafts", params={"status": "pending"}, headers=admin_headers).json()
    assert len(pending) == 1 and pending[0]["name"] == "Pending One"

    assert client.get("/api/v1/admin/moderation/stadium-drafts",
                      params={"status": "bogus"}, headers=admin_headers).status_code == 422


def test_owners_search(client, db_session, admin_headers):
    _create_user(db_session, full_name="Arena Boss", phone="+998905555555", role=UserRole.owner, )
    resp = client.get("/api/v1/admin/owners", params={"q": "Arena"}, headers=admin_headers)
    assert [o["full_name"] for o in resp.json()] == ["Arena Boss"]


# ---------- Role management ----------


def test_role_change_promotes_and_invalidates_sessions(client, db_session, superadmin, admin_headers, regular_user):
    old_headers = _headers_for(regular_user)
    resp = client.post(f"/api/v1/admin/users/{regular_user.id}/role",
                       headers=admin_headers, json={"role": "moderator"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "moderator"

    # Old tokens are killed; fresh session must be established.
    assert client.get("/api/v1/bookings/my", headers=old_headers).status_code in (400, 401)

    entry = db_session.query(AuditLog).filter(AuditLog.action == "role_changed").first()
    assert entry is not None and entry.metadata_json == {"from": "user", "to": "moderator"}


def test_role_change_guards(client, db_session, superadmin, admin_headers, regular_user):
    other_admin = _create_user(db_session, full_name="Second Admin", phone="+998903333334", role=UserRole.superadmin)
    # self
    assert client.post(f"/api/v1/admin/users/{superadmin.id}/role",
                       headers=admin_headers, json={"role": "moderator"}).status_code == 400
    # superadmin target
    assert client.post(f"/api/v1/admin/users/{other_admin.id}/role",
                       headers=admin_headers, json={"role": "user"}).status_code == 400
    # unmanaged role (superadmin is env-controlled, never assignable via API)
    assert client.post(f"/api/v1/admin/users/{regular_user.id}/role",
                       headers=admin_headers, json={"role": "superadmin"}).status_code == 422
    # same role
    assert client.post(f"/api/v1/admin/users/{regular_user.id}/role",
                       headers=admin_headers, json={"role": "user"}).status_code == 400
    # missing user
    assert client.post("/api/v1/admin/users/99999/role", headers=admin_headers, json={"role": "user"}).status_code == 404


def test_owner_role_assign_revoke_and_audit(client, db_session, superadmin, admin_headers):
    tg_user = _create_user(db_session, full_name="Telegram User", phone="+998906666666", role=UserRole.user)
    tg_user.telegram_id = "99887766"
    db_session.commit()

    # Assign: next Telegram auth grants owner permissions, old sessions die.
    old_headers = _headers_for(tg_user)
    resp = client.post(f"/api/v1/admin/users/{tg_user.id}/role",
                       headers=admin_headers, json={"role": "owner"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "owner"
    assert client.get("/api/v1/bookings/my", headers=old_headers).status_code in (400, 401)

    entry = (db_session.query(AuditLog)
             .filter(AuditLog.action == "role_changed", AuditLog.entity_id == tg_user.id)
             .order_by(AuditLog.id.desc()).first())
    assert entry is not None and entry.metadata_json == {"from": "user", "to": "owner"}
    assert entry.actor_id == superadmin.id

    # Revoke: back to a plain user, audited the same way.
    resp = client.post(f"/api/v1/admin/users/{tg_user.id}/role",
                       headers=admin_headers, json={"role": "user"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "user"
    entry = (db_session.query(AuditLog)
             .filter(AuditLog.action == "role_changed", AuditLog.entity_id == tg_user.id)
             .order_by(AuditLog.id.desc()).first())
    assert entry.metadata_json == {"from": "owner", "to": "user"}


def test_owner_role_requires_telegram_id(client, superadmin, admin_headers, regular_user):
    resp = client.post(f"/api/v1/admin/users/{regular_user.id}/role",
                       headers=admin_headers, json={"role": "owner"})
    assert resp.status_code == 400
    assert regular_user.role == UserRole.user  # unchanged


def test_owner_role_assign_requires_superadmin(client, regular_user):
    resp = client.post(f"/api/v1/admin/users/{regular_user.id}/role",
                       headers=_headers_for(regular_user), json={"role": "owner"})
    assert resp.status_code == 403


# ---------- Settings ----------


def test_settings_defaults_and_validation(client, admin_headers):
    resp = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert resp.status_code == 200
    items = {s["key"]: s for s in resp.json()}
    assert items["maintenance_mode"]["value"] == "false"
    assert items["broadcast_interval_seconds"]["value"] == "60"

    assert client.patch("/api/v1/admin/settings/maintenance_mode",
                        headers=admin_headers, json={"value": "maybe"}).status_code == 422
    assert client.patch("/api/v1/admin/settings/broadcast_interval_seconds",
                        headers=admin_headers, json={"value": "-5"}).status_code == 422
    assert client.patch("/api/v1/admin/settings/nope",
                        headers=admin_headers, json={"value": "1"}).status_code == 404

    resp = client.patch("/api/v1/admin/settings/broadcast_interval_seconds",
                        headers=admin_headers, json={"value": "120"})
    assert resp.status_code == 200 and resp.json()["value"] == "120"
    persisted = client.get("/api/v1/admin/settings", headers=admin_headers).json()
    assert {s["key"]: s for s in persisted}["broadcast_interval_seconds"]["value"] == "120"


def test_maintenance_mode_blocks_public_but_not_admin(client, admin_headers):
    assert client.get("/api/v1/stadiums/").status_code == 200

    client.patch("/api/v1/admin/settings/maintenance_mode", headers=admin_headers, json={"value": "true"})
    assert client.get("/api/v1/stadiums/").status_code == 503
    assert client.get("/api/v1/admin/users", headers=admin_headers).status_code == 200
    assert client.get("/health").status_code == 200

    client.patch("/api/v1/admin/settings/maintenance_mode", headers=admin_headers, json={"value": "false"})
    assert client.get("/api/v1/stadiums/").status_code == 200


def test_broadcast_interval_reads_setting(client, admin_headers):
    first = client.post("/api/v1/admin/broadcasts", headers=admin_headers,
                        json={"audience": "owners", "title": "One", "message": "m"})
    assert first.status_code == 200

    second = client.post("/api/v1/admin/broadcasts", headers=admin_headers,
                         json={"audience": "owners", "title": "Two", "message": "m"})
    assert second.status_code in (400, 429)  # 429 (interval) or 400 (still sending)

    client.patch("/api/v1/admin/settings/broadcast_interval_seconds", headers=admin_headers, json={"value": "0"})
    third = client.post("/api/v1/admin/broadcasts", headers=admin_headers,
                        json={"audience": "owners", "title": "Three", "message": "m"})
    assert third.status_code in (200, 400)  # 400 only if the first is still sending
    if third.status_code == 200:
        assert "60 soniyada" not in (third.json().get("detail") or "")


# ---------- CSV export ----------


def test_export_users_csv(client, admin_headers, regular_user):
    resp = client.get("/api/v1/admin/export/users", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers["content-disposition"]
    body = resp.text
    assert "full_name" in body and "Regular User" in body


def test_export_bookings_csv_with_filters(client, db_session, superadmin, admin_headers, regular_user):
    stadium = Stadium(owner_id=superadmin.id, name="CSV Arena", slug="csv-arena",
                      address="Toshkent", phone="+998901234567", price_per_hour=100000)
    db_session.add(stadium)
    db_session.commit()
    _make_booking(db_session, stadium_id=stadium.id, user_id=regular_user.id, code="CSV001", date="2026-08-01")

    resp = client.get("/api/v1/admin/export/bookings", headers=admin_headers)
    assert resp.status_code == 200 and "CSV001" in resp.text

    resp = client.get("/api/v1/admin/export/bookings", params={"status": "confirmed"}, headers=admin_headers)
    assert "CSV001" not in resp.text


def test_export_audit_csv(client, admin_headers, regular_user):
    client.post(f"/api/v1/admin/users/{regular_user.id}/block", headers=admin_headers)
    resp = client.get("/api/v1/admin/export/audit", headers=admin_headers)
    assert resp.status_code == 200 and "user_blocked" in resp.text
    assert client.get("/api/v1/admin/export/audit", params={"date_from": "bogus"}, headers=admin_headers).status_code == 422


def test_statistics_daily_revenue_series(client, admin_headers):
    body = client.get("/api/v1/admin/statistics", headers=admin_headers).json()
    assert isinstance(body["daily_revenue"], list)
    assert len(body["daily_revenue"]) == 30
    assert all("date" in day and "revenue" in day for day in body["daily_revenue"])

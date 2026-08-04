import pytest

from app.core.security import create_access_token, get_password_hash
from app.models.stadium import Stadium
from app.models.user import User, UserRole


def _create_user(db_session, *, full_name, phone, role):
    user = User(
        full_name=full_name,
        phone=phone,
        hashed_password=get_password_hash("TestPass123!"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _headers_for(user):
    # Mint tokens directly (auth/login is rate-limited per test session).
    return {"Authorization": f"Bearer {create_access_token({'sub': str(user.id)})}"}


@pytest.fixture
def owner(db_session):
    return _create_user(db_session, full_name="Owner One", phone="+998901111111", role=UserRole.owner)


@pytest.fixture
def owner_headers(owner):
    return _headers_for(owner)


@pytest.fixture
def other_owner(db_session):
    return _create_user(db_session, full_name="Owner Two", phone="+998902222222", role=UserRole.owner)


@pytest.fixture
def other_owner_headers(other_owner):
    return _headers_for(other_owner)


@pytest.fixture
def superadmin(db_session):
    return _create_user(db_session, full_name="Super Admin", phone="+998909999999", role=UserRole.superadmin)


@pytest.fixture
def admin_headers(superadmin):
    return _headers_for(superadmin)


@pytest.fixture
def owner_stadium(db_session, owner):
    stadium = Stadium(
        owner_id=owner.id,
        name="Chilonzor Arena",
        slug="chilonzor-arena",
        address="Chilonzor tumani, Bunyodkor shoh ko'chasi",
        district="Chilonzor",
        phone="+998901234567",
        price_per_hour=100000,
    )
    db_session.add(stadium)
    db_session.commit()
    db_session.refresh(stadium)
    return stadium


def _payload(**overrides):
    data = {
        "title": "Bolalar futbol maktabi",
        "sport": "football",
        "description": "Haftasiga 3 marta, tajribali murabbiy",
        "coach_name": "Jasur Karimov",
        "schedule_text": "Du-Chor-Jum 18:00-19:30",
        "price_text": "300 000 so'm/oy",
        "age_group": "kids",
        "address": "Chilonzor tumani, 12-kvartal",
        "district": "Chilonzor",
        "phone": "+998901112233",
        "telegram": "@coach_jasur",
        "instagram": "futbol_maktab",
    }
    data.update(overrides)
    return data


def _create_draft(client, headers, **overrides):
    resp = client.post("/api/v1/owner/training-drafts", json=_payload(**overrides), headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _approve(client, admin_headers, draft_id):
    resp = client.post(f"/api/v1/admin/moderation/training-drafts/{draft_id}/approve", json={}, headers=admin_headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _publish_training(client, owner_headers, admin_headers, **overrides):
    draft = _create_draft(client, owner_headers, **overrides)
    _approve(client, admin_headers, draft["id"])
    trainings = client.get("/api/v1/trainings/").json()
    return next(t for t in trainings if t["title"] == _payload(**overrides)["title"])


# ---------- public listing ----------


def test_public_trainings_list_returns_empty(client):
    resp = client.get("/api/v1/trainings/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_nonexistent_training_returns_404(client):
    resp = client.get("/api/v1/trainings/nonexistent-slug")
    assert resp.status_code == 404


# ---------- draft lifecycle ----------


def test_create_draft_requires_owner_role(client, auth_headers):
    resp = client.post("/api/v1/owner/training-drafts", json=_payload(), headers=auth_headers)
    assert resp.status_code == 403


def test_create_draft_and_approve_publishes_training(client, owner_headers, admin_headers):
    draft = _create_draft(client, owner_headers)
    assert draft["status"] == "pending"
    assert draft["draft_type"] == "create"
    assert draft["training_id"] is None

    # Not visible until approved
    assert client.get("/api/v1/trainings/").json() == []

    queue = client.get("/api/v1/admin/moderation/training-drafts", headers=admin_headers)
    assert queue.status_code == 200
    assert any(d["id"] == draft["id"] for d in queue.json())

    approved = _approve(client, admin_headers, draft["id"])
    assert approved["status"] == "approved"

    trainings = client.get("/api/v1/trainings/").json()
    assert len(trainings) == 1
    training = trainings[0]
    assert training["title"] == "Bolalar futbol maktabi"
    assert training["sport"] == "football"
    assert training["address"] == "Chilonzor tumani, 12-kvartal"
    assert training["slug"]

    detail = client.get(f"/api/v1/trainings/{training['slug']}")
    assert detail.status_code == 200
    assert detail.json()["coach_name"] == "Jasur Karimov"


def test_reject_draft_creates_no_training(client, owner_headers, admin_headers):
    draft = _create_draft(client, owner_headers)
    resp = client.post(
        f"/api/v1/admin/moderation/training-drafts/{draft['id']}/reject",
        json={"review_note": "Telefon raqam xato"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
    assert client.get("/api/v1/trainings/").json() == []


def test_update_draft_applies_changes_on_approve(client, owner_headers, admin_headers):
    training = _publish_training(client, owner_headers, admin_headers)
    original_slug = training["slug"]

    resp = client.post(
        f"/api/v1/owner/trainings/{training['id']}/draft",
        json={"price_text": "250 000 so'm/oy"},
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    draft = resp.json()
    assert draft["draft_type"] == "update"
    assert draft["training_id"] == training["id"]
    # Prefilled with the rest of the training's data
    assert draft["title"] == "Bolalar futbol maktabi"
    assert draft["price_text"] == "250 000 so'm/oy"

    _approve(client, admin_headers, draft["id"])

    detail = client.get(f"/api/v1/trainings/{original_slug}").json()
    assert detail["price_text"] == "250 000 so'm/oy"
    assert detail["slug"] == original_slug


def test_rejected_update_draft_leaves_published_training_untouched(client, owner_headers, admin_headers):
    training = _publish_training(client, owner_headers, admin_headers)

    resp = client.post(
        f"/api/v1/owner/trainings/{training['id']}/draft",
        json={"title": "Yangi nom"},
        headers=owner_headers,
    )
    draft = resp.json()
    client.post(
        f"/api/v1/admin/moderation/training-drafts/{draft['id']}/reject",
        json={"review_note": "Nom mos emas"},
        headers=admin_headers,
    )

    detail = client.get(f"/api/v1/trainings/{training['slug']}").json()
    assert detail["title"] == "Bolalar futbol maktabi"


def test_draft_editing_blocked_after_approval(client, owner_headers, admin_headers):
    draft = _create_draft(client, owner_headers)
    _approve(client, admin_headers, draft["id"])
    resp = client.put(
        f"/api/v1/owner/training-drafts/{draft['id']}",
        json={"title": "Boshqa nom"},
        headers=owner_headers,
    )
    assert resp.status_code == 400


# ---------- owner scoping ----------


def test_owner_cannot_manage_foreign_training(client, db_session, owner_headers, other_owner_headers, admin_headers):
    training = _publish_training(client, owner_headers, admin_headers)

    resp = client.post(f"/api/v1/owner/trainings/{training['id']}/draft", json={}, headers=other_owner_headers)
    assert resp.status_code == 404

    resp = client.post(f"/api/v1/owner/trainings/{training['id']}/deactivate", headers=other_owner_headers)
    assert resp.status_code == 404

    assert client.get(f"/api/v1/trainings/{training['slug']}").status_code == 200


def test_admin_endpoints_require_superadmin(client, owner_headers):
    assert client.get("/api/v1/admin/moderation/training-drafts", headers=owner_headers).status_code == 403
    assert client.get("/api/v1/admin/trainings", headers=owner_headers).status_code == 403


# ---------- validation ----------


def test_create_draft_validation_errors(client, owner_headers):
    missing_phone = _payload()
    missing_phone["phone"] = ""
    assert client.post("/api/v1/owner/training-drafts", json=missing_phone, headers=owner_headers).status_code == 422

    assert client.post("/api/v1/owner/training-drafts", json=_payload(sport="quidditch"), headers=owner_headers).status_code == 422
    assert client.post("/api/v1/owner/training-drafts", json=_payload(age_group="pensionerlar"), headers=owner_headers).status_code == 422

    no_address = _payload(address="")
    assert client.post("/api/v1/owner/training-drafts", json=no_address, headers=owner_headers).status_code == 422


def test_stadium_link_requires_own_stadium(client, other_owner_headers, owner_stadium):
    resp = client.post(
        "/api/v1/owner/training-drafts",
        json=_payload(stadium_id=owner_stadium.id),
        headers=other_owner_headers,
    )
    assert resp.status_code == 404


def test_stadium_linked_training_inherits_location(client, owner_headers, admin_headers, owner_stadium):
    draft = _create_draft(client, owner_headers, stadium_id=owner_stadium.id)
    assert draft["stadium_id"] == owner_stadium.id

    _approve(client, admin_headers, draft["id"])

    trainings = client.get("/api/v1/trainings/").json()
    assert len(trainings) == 1
    training = trainings[0]
    assert training["address"] == owner_stadium.address
    assert training["district"] == owner_stadium.district
    assert training["stadium_id"] == owner_stadium.id
    assert training["stadium_name"] == "Chilonzor Arena"
    assert training["stadium_slug"] == "chilonzor-arena"


# ---------- activate / deactivate ----------


def test_deactivate_hides_training_and_activate_restores(client, owner_headers, admin_headers):
    training = _publish_training(client, owner_headers, admin_headers)

    resp = client.post(f"/api/v1/owner/trainings/{training['id']}/deactivate", headers=owner_headers)
    assert resp.status_code == 200
    assert client.get("/api/v1/trainings/").json() == []
    assert client.get(f"/api/v1/trainings/{training['slug']}").status_code == 404

    resp = client.post(f"/api/v1/owner/trainings/{training['id']}/activate", headers=owner_headers)
    assert resp.status_code == 200
    assert client.get(f"/api/v1/trainings/{training['slug']}").status_code == 200


# ---------- filters & analytics ----------


def test_list_filters(client, owner_headers, admin_headers):
    _publish_training(client, owner_headers, admin_headers)
    _publish_training(
        client,
        owner_headers,
        admin_headers,
        title="Tennis darslari",
        sport="tennis",
        district="Yunusobod",
        age_group="adults",
    )

    by_sport = client.get("/api/v1/trainings/?sport=tennis").json()
    assert len(by_sport) == 1
    assert by_sport[0]["sport"] == "tennis"

    by_district = client.get("/api/v1/trainings/?district=Yunusobod").json()
    assert len(by_district) == 1

    by_search = client.get("/api/v1/trainings/?search=tennis").json()
    assert len(by_search) == 1

    by_age = client.get("/api/v1/trainings/?age_group=kids").json()
    assert len(by_age) == 1
    assert by_age[0]["age_group"] == "kids"


def test_contact_click_tracking(client, owner_headers, admin_headers, db_session):
    from app.models.analytics import AnalyticsEvent

    training = _publish_training(client, owner_headers, admin_headers)

    resp = client.post(f"/api/v1/trainings/{training['slug']}/contact-click")
    assert resp.status_code == 200

    event = (
        db_session.query(AnalyticsEvent)
        .filter(AnalyticsEvent.event_type == "training_contact_click")
        .first()
    )
    assert event is not None

    assert client.post("/api/v1/trainings/nonexistent-slug/contact-click").status_code == 404


def test_owner_stadiums_list_for_picker(client, owner_headers, owner_stadium):
    resp = client.get("/api/v1/owner/stadiums", headers=owner_headers)
    assert resp.status_code == 200
    stadiums = resp.json()
    assert len(stadiums) == 1
    assert stadiums[0]["id"] == owner_stadium.id
    assert stadiums[0]["name"] == "Chilonzor Arena"

    assert client.get("/api/v1/owner/stadiums").status_code == 401


def test_trainings_filter_by_stadium_id(client, owner_headers, admin_headers, owner_stadium):
    linked = _create_draft(client, owner_headers, stadium_id=owner_stadium.id)
    _approve(client, admin_headers, linked["id"])
    _create_draft(client, owner_headers, title="Erkin mashg'ulot")
    free = client.get("/api/v1/admin/moderation/training-drafts", headers=admin_headers).json()
    free_draft = next(d for d in free if d["title"] == "Erkin mashg'ulot")
    _approve(client, admin_headers, free_draft["id"])

    by_stadium = client.get(f"/api/v1/trainings/?stadium_id={owner_stadium.id}").json()
    assert len(by_stadium) == 1
    assert by_stadium[0]["stadium_id"] == owner_stadium.id

    assert len(client.get("/api/v1/trainings/").json()) == 2


def test_admin_feature_and_deactivate_training(client, owner_headers, admin_headers):
    training = _publish_training(client, owner_headers, admin_headers)

    resp = client.patch(f"/api/v1/admin/trainings/{training['id']}", json={"is_featured": True}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_featured"] is True

    resp = client.patch(f"/api/v1/admin/trainings/{training['id']}", json={"is_active": False}, headers=admin_headers)
    assert resp.status_code == 200
    assert client.get("/api/v1/trainings/").json() == []

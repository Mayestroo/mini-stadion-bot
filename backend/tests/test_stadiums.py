from app.models.stadium import Stadium


def _make_stadium(db_session, *, slug, name="Arena", district=None, latitude=None, longitude=None):
    stadium = Stadium(
        name=name,
        slug=slug,
        address="Toshkent",
        phone="+998901234567",
        price_per_hour=100000,
        district=district,
        latitude=latitude,
        longitude=longitude,
    )
    db_session.add(stadium)
    db_session.commit()
    return stadium


def test_list_stadiums_returns_empty(client):
    resp = client.get("/api/v1/stadiums/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_stadiums_with_auth_returns_empty(client, auth_headers):
    resp = client.get("/api/v1/stadiums/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_nonexistent_stadium_returns_404(client):
    resp = client.get("/api/v1/stadiums/999")
    assert resp.status_code == 404


def test_get_nonexistent_stadium_by_slug_returns_404(client):
    resp = client.get("/api/v1/stadiums/nonexistent-slug")
    assert resp.status_code == 404


# ---------- Districts ----------


def test_districts_endpoint_dedupes_and_sorts(client, db_session):
    _make_stadium(db_session, slug="d1", district="Chilonzor")
    _make_stadium(db_session, slug="d2", district=" chilonzor ")
    _make_stadium(db_session, slug="d3", district="Yunusobod")
    _make_stadium(db_session, slug="d4", district=None)

    resp = client.get("/api/v1/stadiums/districts")
    assert resp.status_code == 200
    body = resp.json()
    assert [d.lower() for d in body] == ["chilonzor", "yunusobod"]


def test_district_filter_is_case_insensitive(client, db_session):
    _make_stadium(db_session, slug="f1", name="Chilonzor Field", district="Chilonzor")
    _make_stadium(db_session, slug="f2", name="Yunusobod Field", district="Yunusobod")

    resp = client.get("/api/v1/stadiums/", params={"district": "chilonzor"})
    assert resp.status_code == 200
    assert [s["name"] for s in resp.json()] == ["Chilonzor Field"]

    resp = client.get("/api/v1/stadiums/", params={"district": "  CHILONZOR "})
    assert [s["name"] for s in resp.json()] == ["Chilonzor Field"]


# ---------- Nearest sort ----------


def test_nearest_sort_orders_by_distance(client, db_session):
    base_lat, base_lng = 41.3111, 69.2797  # Tashkent centre
    _make_stadium(db_session, slug="n1", name="Near", latitude=41.312, longitude=69.28)
    _make_stadium(db_session, slug="n2", name="Mid", latitude=41.35, longitude=69.28)
    _make_stadium(db_session, slug="n3", name="Far", latitude=41.7, longitude=69.5)
    _make_stadium(db_session, slug="n4", name="NoCoords")

    resp = client.get("/api/v1/stadiums/", params={"sort": "nearest", "lat": base_lat, "lng": base_lng})
    assert resp.status_code == 200
    body = resp.json()
    assert [s["name"] for s in body] == ["Near", "Mid", "Far", "NoCoords"]
    distances = [s["distance_km"] for s in body[:3]]
    assert all(d is not None for d in distances)
    assert distances == sorted(distances)
    assert body[3]["distance_km"] is None


def test_nearest_sort_requires_coordinates(client):
    assert client.get("/api/v1/stadiums/", params={"sort": "nearest"}).status_code == 422
    assert client.get("/api/v1/stadiums/", params={"sort": "bogus"}).status_code == 422


# ---------- Map links ----------


def test_map_links_generated_from_coordinates(client, db_session):
    stadium = _make_stadium(db_session, slug="m1", latitude=41.312, longitude=69.28)
    body = client.get(f"/api/v1/stadiums/{stadium.slug}").json()
    assert "41.312,69.28" in body["google_maps_url"]
    # Yandex expects lng,lat order in `pt=`.
    assert "pt=69.28,41.312" in body["yandex_maps_url"]


def test_custom_map_links_override_generated(client, db_session):
    stadium = _make_stadium(db_session, slug="m2", latitude=41.312, longitude=69.28)
    stadium.google_map_link = "https://goo.gl/maps/xyz"
    stadium.yandex_map_link = "https://yandex.uz/maps/-/custom"
    db_session.commit()
    body = client.get(f"/api/v1/stadiums/{stadium.slug}").json()
    assert body["google_maps_url"] == "https://goo.gl/maps/xyz"
    assert body["yandex_maps_url"] == "https://yandex.uz/maps/-/custom"


def test_map_links_absent_without_coordinates(client, db_session):
    stadium = _make_stadium(db_session, slug="m3")
    body = client.get(f"/api/v1/stadiums/{stadium.slug}").json()
    assert body["google_maps_url"] is None
    assert body["yandex_maps_url"] is None


def test_create_stadium_accepts_map_links(client, db_session):
    from app.core.security import create_access_token, get_password_hash
    from app.models.user import User, UserRole
    admin = User(full_name="SA", phone="+998907777777", hashed_password=get_password_hash("x"), role=UserRole.superadmin)
    db_session.add(admin)
    db_session.commit()
    headers = {"Authorization": f"Bearer {create_access_token({'sub': str(admin.id)})}"}

    resp = client.post("/api/v1/stadiums/", headers=headers, json={
        "name": "Link Arena",
        "address": "Toshkent",
        "phone": "+998901234567",
        "price_per_hour": 100000,
        "google_map_link": "https://goo.gl/maps/arena",
        "yandex_map_link": "https://yandex.uz/maps/-/arena",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["google_maps_url"] == "https://goo.gl/maps/arena"
    assert body["yandex_maps_url"] == "https://yandex.uz/maps/-/arena"

def test_create_booking_requires_auth(client):
    resp = client.post("/api/v1/bookings/", json={
        "stadium_id": 1,
        "date": "2026-07-30",
        "start_time": "10:00",
        "end_time": "11:00",
    })
    assert resp.status_code == 401


def test_list_my_bookings_requires_auth(client):
    resp = client.get("/api/v1/bookings/my")
    assert resp.status_code == 401

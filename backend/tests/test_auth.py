def test_register_new_user(client):
    resp = client.post("/api/v1/auth/register", json={
        "full_name": "New User",
        "phone": "+998901111111",
        "password": "Securepass1",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["phone"] == "+998901111111"


def test_register_duplicate_phone_returns_400(client, test_user):
    resp = client.post("/api/v1/auth/register", json={
        "full_name": "Duplicate",
        "phone": "+998901234567",
        "password": "Securepass1",
    })
    assert resp.status_code == 400


def test_login_valid_credentials(client, test_user):
    resp = client.post("/api/v1/auth/login", json={
        "phone": "+998901234567",
        "password": "testpass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


def test_login_invalid_password_returns_401(client, test_user):
    resp = client.post("/api/v1/auth/login", json={
        "phone": "+998901234567",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user_returns_401(client):
    resp = client.post("/api/v1/auth/login", json={
        "phone": "+998909999999",
        "password": "testpass123",
    })
    assert resp.status_code == 401

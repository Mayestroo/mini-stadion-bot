def test_health_returns_200(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "database" in data


def test_root_returns_message(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "message" in resp.json()

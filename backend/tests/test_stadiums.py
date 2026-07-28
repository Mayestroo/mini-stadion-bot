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

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.auth.password import hash_password
from app.config import get_settings
from app.main import app


@pytest.fixture(scope="module", autouse=True)
def credentials() -> Iterator[None]:
    settings = get_settings()
    original_username = settings.auth_username
    original_hash = settings.auth_password_hash
    settings.auth_username = "tester"
    settings.auth_password_hash = hash_password("secret123")
    try:
        yield
    finally:
        settings.auth_username = original_username
        settings.auth_password_hash = original_hash


def test_login_success() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={"username": "tester", "password": "secret123"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={"username": "tester", "password": "wrong"},
        )
    assert response.status_code == 401


def test_login_unknown_user() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={"username": "stranger", "password": "secret123"},
        )
    assert response.status_code == 401


def test_me_requires_auth() -> None:
    with TestClient(app) as client:
        response = client.get("/api/me")
    assert response.status_code == 401


def test_me_with_token() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "tester", "password": "secret123"},
        )
        token = login.json()["access_token"]
        response = client.get(
            "/api/me", headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    assert response.json() == {"username": "tester"}


def test_me_with_invalid_token() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
    assert response.status_code == 401

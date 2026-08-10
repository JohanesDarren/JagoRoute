"""F-01 Auth endpoint tests."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, register_user


@pytest.mark.anyio
async def test_register_login_me_flow(client: AsyncClient):
    tokens = await register_user(client)
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["user"]["email"] == "halim@jago.io"

    me = await client.get("/api/v1/auth/me", headers=auth_headers(tokens))
    assert me.status_code == 200
    assert me.json()["email"] == "halim@jago.io"


@pytest.mark.anyio
async def test_login_succeeds(client: AsyncClient):
    await register_user(client, email="fitri@jago.io")
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "fitri@jago.io", "password": "password123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


@pytest.mark.anyio
async def test_login_wrong_password(client: AsyncClient):
    await register_user(client, email="fitri@jago.io")
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "fitri@jago.io", "password": "wrong-pass"}
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_register_duplicate_email(client: AsyncClient):
    await register_user(client, email="dup@jago.io")
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@jago.io", "password": "password123"},
    )
    assert resp.status_code == 409


@pytest.mark.anyio
async def test_refresh_rotates_tokens(client: AsyncClient):
    tokens = await register_user(client)
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    assert resp.json()["access_token"]
    assert resp.json()["refresh_token"]


@pytest.mark.anyio
async def test_me_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
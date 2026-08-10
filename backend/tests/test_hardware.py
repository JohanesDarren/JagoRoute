"""F-03 Hardware API Registry tests."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, create_hardware, register_user
from tests.test_auth import register_user as _r  # noqa


@pytest.mark.anyio
async def test_crud_hardware(client: AsyncClient):
    tokens = await register_user(client)

    created = await create_hardware(client, tokens)
    hid = created["id"]
    assert created["name"] == "ESP32 Sensor A"
    assert created["base_url"].endswith(":8080")  # trailing slash stripped

    listing = await client.get("/api/v1/hardware", headers=auth_headers(tokens))
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    updated = await client.patch(
        f"/api/v1/hardware/{hid}", json={"status": "inactive"}, headers=auth_headers(tokens)
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "inactive"

    deleted = await client.delete(f"/api/v1/hardware/{hid}", headers=auth_headers(tokens))
    assert deleted.status_code == 204

    gone = await client.get(f"/api/v1/hardware/{hid}", headers=auth_headers(tokens))
    assert gone.status_code == 404


@pytest.mark.anyio
async def test_hardware_ownership_is_isolated(client: AsyncClient):
    tokens_a = await register_user(client, email="a@jago.io")
    tokens_b = await register_user(client, email="b@jago.io")

    created = await create_hardware(client, tokens_a)
    hid = created["id"]

    # B cannot see or touch A's hardware
    listing = await client.get("/api/v1/hardware", headers=auth_headers(tokens_b))
    assert listing.json() == []

    patch = await client.patch(
        f"/api/v1/hardware/{hid}", json={"name": "hacked"}, headers=auth_headers(tokens_b)
    )
    assert patch.status_code == 404


@pytest.mark.anyio
async def test_invalid_status_rejected(client: AsyncClient):
    tokens = await register_user(client)
    resp = await client.post(
        "/api/v1/hardware",
        json={"name": "x", "base_url": "http://x", "status": "bogus"},
        headers=auth_headers(tokens),
    )
    assert resp.status_code == 422
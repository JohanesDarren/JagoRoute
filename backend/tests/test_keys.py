"""F-05 API Key Manager tests."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, create_key, register_user


@pytest.mark.anyio
async def test_generate_key_returns_full_key_once(client: AsyncClient):
    tokens = await register_user(client)
    resp = await create_key(client, tokens, name="Production Server Key")

    assert resp["key"].startswith("jago_live_")
    assert resp["key_prefix"].startswith("jago_")
    assert resp["name"] == "Production Server Key"
    assert resp["revoked_at"] is None

    # listing never exposes the full key
    listing = await client.get("/api/v1/keys", headers=auth_headers(tokens))
    assert "key" not in listing.json()[0]


@pytest.mark.anyio
async def test_revoke_key(client: AsyncClient):
    tokens = await register_user(client)
    key = await create_key(client, tokens)

    revoke = await client.delete(f"/api/v1/keys/{key['id']}", headers=auth_headers(tokens))
    assert revoke.status_code == 200
    assert revoke.json()["revoked_at"] is not None

    listing = await client.get("/api/v1/keys", headers=auth_headers(tokens))
    assert listing.json()[0]["revoked_at"] is not None
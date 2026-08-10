"""F-04 Route Builder tests."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers, create_hardware, create_route, register_user


@pytest.mark.anyio
async def test_create_and_list_route(client: AsyncClient):
    tokens = await register_user(client)
    hw = await create_hardware(client, tokens)
    route = await create_route(client, tokens, "all-sensors", [hw["id"]])

    assert route["route_path"] == "all-sensors"
    assert len(route["mappings"]) == 1
    assert route["mappings"][0]["hardware"]["name"] == "ESP32 Sensor A"

    listing = await client.get("/api/v1/routes", headers=auth_headers(tokens))
    assert len(listing.json()) == 1


@pytest.mark.anyio
async def test_duplicate_route_path_conflict(client: AsyncClient):
    tokens = await register_user(client)
    hw = await create_hardware(client, tokens)
    await create_route(client, tokens, "dup", [hw["id"]])
    resp = await client.post(
        "/api/v1/routes",
        json={
            "route_path": "dup",
            "mappings": [{"hardware_id": hw["id"], "target_path": "/x"}],
        },
        headers=auth_headers(tokens),
    )
    assert resp.status_code == 409


@pytest.mark.anyio
async def test_cannot_map_foreign_hardware(client: AsyncClient):
    tokens_a = await register_user(client, email="a@jago.io")
    tokens_b = await register_user(client, email="b@jago.io")

    hw = await create_hardware(client, tokens_a)
    resp = await client.post(
        "/api/v1/routes",
        json={
            "route_path": "steal",
            "mappings": [{"hardware_id": hw["id"], "target_path": "/x"}],
        },
        headers=auth_headers(tokens_b),
    )
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_replaces_mappings(client: AsyncClient):
    tokens = await register_user(client)
    h1 = await create_hardware(client, tokens, name="H1")
    h2 = await create_hardware(client, tokens, name="H2")
    route = await create_route(client, tokens, "combo", [h1["id"]])

    set_resp = await client.put(
        f"/api/v1/routes/{route['id']}/mappings",
        json=[
            {"hardware_id": h1["id"], "target_path": "/a", "method": "GET"},
            {"hardware_id": h2["id"], "target_path": "/b", "method": "POST"},
        ],
        headers=auth_headers(tokens),
    )
    assert set_resp.status_code == 200
    assert len(set_resp.json()["mappings"]) == 2


@pytest.mark.anyio
async def test_delete_route(client: AsyncClient):
    tokens = await register_user(client)
    hw = await create_hardware(client, tokens)
    route = await create_route(client, tokens, "temp-route", [hw["id"]])

    resp = await client.delete(f"/api/v1/routes/{route['id']}", headers=auth_headers(tokens))
    assert resp.status_code == 204

    listing = await client.get("/api/v1/routes", headers=auth_headers(tokens))
    assert listing.json() == []
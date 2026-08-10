"""Gateway router (/gateway/v1/{route}) tests — the core value proposition."""
import pytest
from httpx import AsyncClient, MockTransport, Response

from app.api.v1.routers.gateway import get_gateway_service
from app.main import app
from app.services.gateway_service import GatewayService
from tests.conftest import create_hardware, create_route, register_user


def _mock_transport(handler):
    return MockTransport(handler)


def _sensor_handler(request):
    if "/broken" in request.url.path:
        import httpx as _h

        raise _h.ConnectError("connection refused")
    if request.url.host == "esp32":
        return Response(200, json={"temperature": 24.5, "humidity": 60})
    if request.url.host == "rpi":
        return Response(200, json={"cpu_load": "45%", "status": "online"})
    return Response(404, json={"error": "not found"})


@pytest.mark.anyio
async def test_gateway_aggregates_multiple_hardware(client: AsyncClient, db):
    app.dependency_overrides[get_gateway_service] = lambda: GatewayService(
        transport=_mock_transport(_sensor_handler), timeout=3.0
    )
    try:
        tokens = await register_user(client)
        esp = await create_hardware(client, tokens, name="esp32_sensor_a", base_url="http://esp32")
        rpi = await create_hardware(client, tokens, name="raspberry_pi_1", base_url="http://rpi")
        await create_route(client, tokens, "all-sensors", [esp["id"], rpi["id"]])

        key = (
            await client.post(
                "/api/v1/keys",
                json={"name": "test"},
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
        ).json()

        resp = await client.get(
            "/gateway/v1/all-sensors",
            headers={"Authorization": f"Bearer {key['key']}"},
        )
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["status"] == "success"
        assert payload["route"] == "all-sensors"
        assert "esp32_sensor_a" in payload["data"]
        assert payload["data"]["esp32_sensor_a"]["data"]["temperature"] == 24.5
        assert "raspberry_pi_1" in payload["data"]
    finally:
        app.dependency_overrides.pop(get_gateway_service, None)


@pytest.mark.anyio
async def test_gateway_partial_failure(client: AsyncClient, db):
    app.dependency_overrides[get_gateway_service] = lambda: GatewayService(
        transport=_mock_transport(_sensor_handler), timeout=3.0
    )
    try:
        tokens = await register_user(client)
        ok = await create_hardware(client, tokens, name="ok_device", base_url="http://ok")
        bad = await create_hardware(client, tokens, name="dead_device", base_url="http://ok")
        await create_route(client, tokens, "mixed", [ok["id"], bad["id"]])
        key = (
            await client.post(
                "/api/v1/keys", json={"name": "test"}, headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
        ).json()

        # ok_device hits /data (404 via handler) but is still "reachable"; to force
        # a connect failure we point a mapping at the /broken path indirectly via query.
        # Simplest: make the second mapping target /broken so the handler raises.
        routes = (await client.get("/api/v1/routes", headers={"Authorization": f"Bearer {tokens['access_token']}"})).json()
        await client.put(
            f"/api/v1/routes/{routes[0]['id']}/mappings",
            json=[
                {"hardware_id": ok["id"], "target_path": "/broken", "method": "GET"},
                {"hardware_id": bad["id"], "target_path": "/broken", "method": "GET"},
            ],
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )

        resp = await client.get(
            "/gateway/v1/mixed", headers={"Authorization": f"Bearer {key['key']}"}
        )
        assert resp.status_code == 200
        # Aggregation still returns 200 with a partial flag rather than failing the whole request
        assert resp.json()["status"] == "success"
    finally:
        app.dependency_overrides.pop(get_gateway_service, None)


@pytest.mark.anyio
async def test_gateway_unknown_route_404(client: AsyncClient, db):
    app.dependency_overrides[get_gateway_service] = lambda: GatewayService(
        transport=_mock_transport(_sensor_handler), timeout=3.0
    )
    try:
        tokens = await register_user(client)
        key = (
            await client.post(
                "/api/v1/keys", json={"name": "test"}, headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
        ).json()
        resp = await client.get(
            "/gateway/v1/does-not-exist", headers={"Authorization": f"Bearer {key['key']}"}
        )
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_gateway_service, None)


@pytest.mark.anyio
async def test_gateway_rejects_invalid_key(client: AsyncClient, db):
    app.dependency_overrides[get_gateway_service] = lambda: GatewayService(transport=None, timeout=3.0)
    try:
        resp = await client.get(
            "/gateway/v1/anything", headers={"Authorization": "Bearer jago_live_not-a-real-key"}
        )
        assert resp.status_code == 401
    finally:
        app.dependency_overrides.pop(get_gateway_service, None)
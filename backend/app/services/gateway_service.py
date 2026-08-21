"""Gateway router core (PRD §5.4).

For every HTTP call to ``GET /gateway/v1/{route_path}`` JagoRoute:
 1. Resolves the route (with Redis short-TTL cache as a hot path),
 2. Fans out asynchronous HTTP requests to every mapped hardware endpoint,
 3. Applies a strict per-request timeout (default 3.0s),
 4. Aggregates results — returning partial data when a device fails,
 5. Logs the request to ``request_logs``.
"""
import json
import logging
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core import redis_client
from app.models.api_key import ApiKey
from app.models.route import Route
from app.repositories import log_repo, route_repo

logger = logging.getLogger("jagoroute.gateway")

CACHE_TTL_SECONDS = 30


def _serialize_route(route: Route) -> dict:
    return {
        "route_id": str(route.id),
        "user_id": str(route.user_id),
        "route_path": route.route_path,
        "mappings": [
            {
                "hardware_id": str(m.hardware_id),
                "hardware_name": m.hardware.name,
                "base_url": m.hardware.base_url,
                "auth_headers": m.hardware.auth_headers or {},
                "query_params": m.hardware.query_params or {},
                "target_path": m.target_path,
                "method": m.method,
            }
            for m in route.mappings
        ],
    }


def _route_from_cache(db: Session, route_path: str) -> dict | None:
    cached = redis_client.cache_get(f"route:gateway:{route_path}")
    if cached is None:
        return None
    try:
        return json.loads(cached)
    except json.JSONDecodeError:
        return None


def _extract_device_id(payload: Any, _depth: int = 0) -> str:
    """Recursively search for 'device_id' inside a response payload.

    Handles varying API wrapper shapes, e.g.:
      - Flat:                     {"device_id": "node-01", ...}
      - Single-wrap:              {"data": {"device_id": "node-01", ...}}
      - Double-wrap (common):     {"success": true, "data": {"data": {"device_id": "node-01"}}}

    Stops after 3 levels of nesting to avoid runaway recursion.
    Returns "unknown" when device_id is not found anywhere.
    """
    if not isinstance(payload, dict) or _depth > 3:
        return "unknown"
    if "device_id" in payload:
        return str(payload["device_id"])
    # Recurse into dict values (prioritises "data" key first for speed)
    for key in ("data", *[k for k in payload if k != "data"]):
        result = _extract_device_id(payload.get(key), _depth + 1)
        if result != "unknown":
            return result
    return "unknown"


class GatewayService:
    """Per-request service resolving routes and proxying to hardware."""

    def __init__(
        self,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: float = 3.0,
    ):
        self._transport = transport
        self.timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        kwargs: dict[str, Any] = {"timeout": self.timeout}
        if self._transport is not None:
            kwargs["transport"] = self._transport
        return httpx.AsyncClient(**kwargs)

    def resolve_route(self, db: Session, route_path: str) -> dict:
        from_cache = _route_from_cache(db, route_path)
        if from_cache is not None:
            return from_cache
        route = route_repo.get_by_path(db, route_path)
        if route is None:
            raise KeyError(route_path)
        serialized = _serialize_route(route)
        redis_client.cache_set(f"route:gateway:{route_path}", serialized, ttl_seconds=CACHE_TTL_SECONDS)
        return serialized

    async def proxy(self, route: dict, method: str, body: bytes | dict | None) -> tuple[dict, bool, list[str]]:
        """Fan out to all mapped hardware. Returns (data_by_device, all_ok, errors).

        Response structure groups sensors by device_id:
            {
                "node-01": {
                    "NPK Soil Sensor": {"status_code": 200, "data": {...}},
                    ...
                },
                "node-02": { ... },
                "unknown": { ... }   # fallback when device_id not found in payload
            }
        """
        raw: dict[str, Any] = {}   # hardware_name -> {status_code, data}
        errors: list[str] = []

        async with self._client() as client:
            async def call_one(mapping: dict) -> None:
                # Use the EXACT URL stored by the user. base_url may already
                # contain the full endpoint path (e.g. .../api/sensor/latest);
                # target_path is an OPTIONAL relative suffix — never append
                # anything when it is empty, and never inject "/data".
                base_url = (mapping["base_url"] or "").rstrip("/")
                target_path = (mapping.get("target_path") or "").strip()
                url = f"{base_url}{target_path if target_path.startswith('/') else '/' + target_path}" if target_path else base_url
                headers = dict(mapping.get("auth_headers") or {})
                params = dict(mapping.get("query_params") or {})
                try:
                    response = await client.request(
                        mapping.get("method", "GET"),
                        url,
                        params=params,
                        headers=headers,
                        content=body if body is not None else None,
                    )
                    payload: Any = None
                    try:
                        payload = response.json()
                    except ValueError:
                        payload = response.text
                    raw[mapping["hardware_name"]] = {
                        "status_code": response.status_code,
                        "data": payload,
                    }
                except httpx.HTTPError as exc:
                    errors.append(f"{mapping['hardware_name']}: {type(exc).__name__}")
                    raw[mapping["hardware_name"]] = {
                        "status_code": 0,
                        "error": "unreachable",
                    }

            import asyncio

            await asyncio.gather(*(call_one(m) for m in route["mappings"]))

        # ── Group results by device_id ──────────────────────────────────────
        # Extract device_id from the response payload (search recursively one
        # level deep to handle varying wrapper shapes like {success, data:{...}}).
        # Falls back to "unknown" so the route never crashes on missing field.
        grouped: dict[str, Any] = {}
        for hw_name, hw_result in raw.items():
            device_id = _extract_device_id(hw_result.get("data"))
            grouped.setdefault(device_id, {})[hw_name] = hw_result

        return grouped, not errors, errors

    async def route_request(
        self,
        db: Session,
        route_path: str,
        api_key: ApiKey,
        method: str,
        body: bytes | dict | None,
        request_path: str,
    ) -> dict:
        from app.repositories import api_key_repo as api_key_repo

        started = time.perf_counter()
        try:
            route = self.resolve_route(db, route_path)
        except KeyError:
            raise

        data, all_ok, errors = await self.proxy(route, method, body)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        log_repo.create(
            db,
            user_id=route["user_id"],
            route_id=route["route_id"],
            api_key_id=None if api_key is None else api_key.id,
            method=method,
            request_path=request_path,
            status_code=200,
            response_time_ms=elapsed_ms,
            success=all_ok,
            error_detail="; ".join(errors) if errors else None,
        )
        if api_key is not None:
            api_key_repo.touch_last_used(db, api_key)

        return {
            "status": "success",
            "route": route["route_path"],
            "data": data,
            "partial": not all_ok,
            "errors": errors,
        }
"""Gateway router — the unified endpoint the Software team puts in their .env."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_api_key
from app.core.config import get_settings
from app.core.database import get_db
from app.core import redis_client
from app.models.api_key import ApiKey
from app.services.gateway_service import GatewayService

router = APIRouter(prefix=get_settings().GATEWAY_PREFIX, tags=["gateway"])


def get_gateway_service() -> GatewayService:
    return GatewayService(timeout=get_settings().GATEWAY_TIMEOUT_SECONDS)


def _rate_limit(api_key: ApiKey) -> None:
    limit = get_settings().GATEWAY_RATE_LIMIT_PER_MINUTE
    key = f"ratelimit:key:{api_key.id}"
    if redis_client.is_rate_limited(key, limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded ({limit}/minute).",
        )


@router.api_route("/{route_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_route(
    route_path: str,
    request: Request,
    api_key: ApiKey = Depends(get_api_key),
    db: Session = Depends(get_db),
    service: GatewayService = Depends(get_gateway_service),
) -> dict:
    """Aggregate all hardware mapped to ``route_path`` and return the merged payload."""
    _rate_limit(api_key)
    body = await _read_body(request)
    try:
        return await service.route_request(
            db=db,
            route_path=route_path,
            api_key=api_key,
            method=request.method,
            body=body,
            request_path=request.url.path,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Route '{route_path}' does not exist."
        )
    except Exception as exc:  # defensive: never leak internals to software team
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Gateway upstream error."
        ) from exc


async def _read_body(request: Request) -> bytes | dict | None:
    body = await request.body()
    if not body:
        return None
    try:
        return await request.json()
    except Exception:
        return body
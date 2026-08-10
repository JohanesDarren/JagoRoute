"""F-06: Request Logs (P1) endpoint."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories import log_repo
from app.schemas.log import RequestLogOut

router = APIRouter(prefix="/logs", tags=["logs"])


def _to_out(log) -> RequestLogOut:
    return RequestLogOut(
        id=str(log.id),
        method=log.method,
        request_path=log.request_path,
        status_code=log.status_code,
        response_time_ms=log.response_time_ms,
        success=log.success,
        error_detail=log.error_detail,
        created_at=log.created_at,
        route_path=log.route.route_path if log.route else None,
        api_key_name=log.api_key.name if log.api_key else None,
    )


@router.get("", response_model=list[RequestLogOut])
def list_logs(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RequestLogOut]:
    return [_to_out(l) for l in log_repo.list_for_user(db, current_user.id, limit)]
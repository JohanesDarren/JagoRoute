from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.request_log import RequestLog


def create(
    db: Session,
    user_id,
    route_id,
    api_key_id,
    method: str,
    request_path: str,
    status_code: int,
    response_time_ms: float,
    success: bool,
    error_detail: str | None,
) -> RequestLog:
    log = RequestLog(
        user_id=user_id,
        route_id=route_id,
        api_key_id=api_key_id,
        method=method,
        request_path=request_path,
        status_code=status_code,
        response_time_ms=response_time_ms,
        success=success,
        error_detail=error_detail,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_for_user(db: Session, user_id, limit: int = 50) -> list[RequestLog]:
    return list(
        db.scalars(
            select(RequestLog)
            .where(RequestLog.user_id == user_id)
            .order_by(RequestLog.created_at.desc())
            .limit(limit)
        )
    )


def count_since(db: Session, user_id, hours: int = 24) -> int:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    return db.scalar(
        select(func.count(RequestLog.id)).where(
            RequestLog.user_id == user_id, RequestLog.created_at >= since
        )
    ) or 0
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.request_log import RequestLog
from app.models.route import Route


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


def stats_for_user(db: Session, user_id, hours: int = 24) -> dict:
    """Aggregate request-log metrics over the last `hours` for analytics."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    base = [RequestLog.user_id == user_id, RequestLog.created_at >= since]

    total = db.scalar(select(func.count(RequestLog.id)).where(*base)) or 0
    success = (
        db.scalar(
            select(func.count(RequestLog.id)).where(*base, RequestLog.success.is_(True))
        )
        or 0
    )
    errors = total - success
    avg_latency = (
        db.scalar(select(func.avg(RequestLog.response_time_ms)).where(*base)) or 0.0
    )

    per_route_rows = db.execute(
        select(
            RequestLog.route_id,
            func.count(RequestLog.id),
            func.sum(case((RequestLog.success.is_(True), 1), else_=0)),
            func.avg(RequestLog.response_time_ms),
        )
        .where(*base)
        .group_by(RequestLog.route_id)
    ).all()

    route_ids = {rid for rid, *_ in per_route_rows if rid is not None}
    route_paths = {
        r.id: r.route_path
        for r in db.scalars(select(Route).where(Route.id.in_(route_ids)))
    } if route_ids else {}

    return {
        "range_hours": hours,
        "total_requests": total,
        "success_count": success,
        "error_count": errors,
        "success_rate": round((success / total * 100), 1) if total else 0.0,
        "avg_latency_ms": round(float(avg_latency), 1),
        "per_route": sorted(
            (
                {
                    "route_path": route_paths.get(rid, "(direct)") if rid else "(direct)",
                    "count": count,
                    "ok": int(ok or 0),
                    "error": int((count or 0) - int(ok or 0)),
                    "avg_latency_ms": round(float(avg or 0.0), 1),
                }
                for rid, count, ok, avg in per_route_rows
            ),
            key=lambda r: r["count"],
            reverse=True,
        ),
    }
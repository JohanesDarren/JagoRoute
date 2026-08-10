"""F-02: Workspace Dashboard stats endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.hardware import HardwareEndpoint
from app.models.route import Route, RouteMapping
from app.models.user import User
from app.repositories import log_repo
from app.schemas.dashboard import DashboardStats
from app.api.v1.routers.logs import _to_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> DashboardStats:
    total_hardware = db.scalar(select(func.count(HardwareEndpoint.id)).where(HardwareEndpoint.user_id == current_user.id)) or 0
    active_hardware = db.scalar(
        select(func.count(HardwareEndpoint.id)).where(
            HardwareEndpoint.user_id == current_user.id, HardwareEndpoint.status == "active"
        )
    ) or 0
    total_routes = db.scalar(select(func.count(Route.id)).where(Route.user_id == current_user.id)) or 0
    active_keys = db.scalar(
        select(func.count(ApiKey.id)).where(ApiKey.user_id == current_user.id, ApiKey.revoked_at.is_(None))
    ) or 0
    total_mapped = db.scalar(select(func.count(RouteMapping.id))) or 0
    total_requests_24h = log_repo.count_since(db, current_user.id, hours=24)
    recent_logs = [_to_out(l) for l in log_repo.list_for_user(db, current_user.id, limit=10)]

    return DashboardStats(
        total_hardware=total_hardware,
        active_hardware=active_hardware,
        total_routes=total_routes,
        active_keys=active_keys,
        total_mapped=total_mapped,
        total_requests_24h=total_requests_24h,
        recent_logs=recent_logs,
    )
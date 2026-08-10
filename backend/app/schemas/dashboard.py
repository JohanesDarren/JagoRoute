"""Workspace dashboard schemas (F-02)."""
from pydantic import BaseModel

from app.schemas.log import RequestLogOut


class DashboardStats(BaseModel):
    total_hardware: int
    active_hardware: int
    total_routes: int
    active_keys: int
    total_mapped: int
    total_requests_24h: int
    recent_logs: list[RequestLogOut] = []
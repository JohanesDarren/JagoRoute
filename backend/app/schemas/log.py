"""Request Log schemas (F-06)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RouteStatOut(BaseModel):
    route_path: str
    count: int
    ok: int
    error: int
    avg_latency_ms: float


class LogStatsOut(BaseModel):
    range_hours: int
    total_requests: int
    success_count: int
    error_count: int
    success_rate: float
    avg_latency_ms: float
    per_route: list[RouteStatOut] = []


class RequestLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    method: str
    request_path: str
    status_code: int
    response_time_ms: float
    success: bool
    error_detail: str | None
    created_at: datetime
    route_path: str | None = None
    api_key_name: str | None = None
"""Request Log schemas (F-06)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
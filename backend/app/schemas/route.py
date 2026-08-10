"""Route Builder schemas (F-04)."""
import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

PATH_RE = re.compile(r"^[a-zA-Z0-9\-_/]+$")


class MappingIn(BaseModel):
    hardware_id: str
    target_path: str = Field(min_length=1, max_length=100)
    method: str = Field(default="GET", pattern="^(GET|POST|PUT|PATCH|DELETE)$")


class MappingOut(BaseModel):
    id: str
    hardware: dict
    target_path: str
    method: str


class RouteCreate(BaseModel):
    route_path: str = Field(min_length=1, max_length=100)
    description: str | None = None
    mappings: list[MappingIn] = Field(default_factory=list)

    @field_validator("route_path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        value = value.strip().strip("/")
        if not PATH_RE.match(value):
            raise ValueError("route_path may only contain letters, numbers, dashes, underscores and slashes")
        return value


class RouteUpdate(BaseModel):
    route_path: str | None = None
    description: str | None = None


class RouteOut(BaseModel):
    id: str
    route_path: str
    description: str | None
    mappings: list[MappingOut] = []
    created_at: datetime


class GatewayResponse(BaseModel):
    status: str = "success"
    route: str
    data: dict
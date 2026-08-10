"""Hardware API Registry schemas (F-03)."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class HardwareCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    base_url: str = Field(min_length=1, max_length=255)
    description: str | None = None
    auth_headers: dict[str, Any] | None = None
    status: str = Field(default="active", pattern="^(active|inactive)$")

    @field_validator("base_url")
    @classmethod
    def normalize_base_url(cls, value: str) -> str:
        return value.rstrip("/")


class HardwareUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    base_url: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    auth_headers: dict[str, Any] | None = None
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class HardwareOut(BaseModel):
    id: str
    name: str
    base_url: str
    description: str | None
    auth_headers: dict[str, Any]
    status: str
    created_at: datetime
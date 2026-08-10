"""API Key Manager schemas (F-05)."""
from datetime import datetime

from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ApiKeyOut(BaseModel):
    id: str
    name: str
    key_prefix: str
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class ApiKeyCreated(ApiKeyOut):
    key: str = Field(description="Full API key. Shown exactly once — copy it now.")
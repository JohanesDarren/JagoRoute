"""hardware_endpoints table: raw device APIs registered by the IoT engineer."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UUIDType


class HardwareEndpoint(Base):
    __tablename__ = "hardware_endpoints"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    auth_headers: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="hardware_endpoints")

    def public_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "base_url": self.base_url,
            "description": self.description,
            "auth_headers": self.auth_headers or {},
            "status": self.status,
            "created_at": self.created_at,
        }
"""request_logs table: traffic passing through the gateway router (F-06)."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Boolean, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UUIDType


class RequestLog(Base):
    __tablename__ = "request_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    route_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("routes.id", ondelete="SET NULL"), index=True
    )
    api_key_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("api_keys.id", ondelete="SET NULL"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    method: Mapped[str] = mapped_column(String(10), default="GET", nullable=False)
    request_path: Mapped[str] = mapped_column(String(255), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_time_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    route = relationship("Route", lazy="joined")
    api_key = relationship("ApiKey", lazy="joined")
"""routes + route_mappings tables: unified endpoints grouping hardware APIs."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UUIDType


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    route_path: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="routes")
    mappings = relationship(
        "RouteMapping",
        back_populates="route",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="RouteMapping.created_at",
    )


class RouteMapping(Base):
    __tablename__ = "route_mappings"
    __table_args__ = (
        UniqueConstraint("route_id", "hardware_id", "target_path", name="uq_route_hardware_target"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("routes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    hardware_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("hardware_endpoints.id"), index=True, nullable=False
    )
    target_path: Mapped[str] = mapped_column(String(100), nullable=False)
    method: Mapped[str] = mapped_column(String(10), default="GET", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    route = relationship("Route", back_populates="mappings")
    hardware = relationship("HardwareEndpoint", lazy="joined")
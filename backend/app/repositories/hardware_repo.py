from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hardware import HardwareEndpoint


def list_for_user(db: Session, user_id) -> list[HardwareEndpoint]:
    return list(
        db.scalars(
            select(HardwareEndpoint)
            .where(HardwareEndpoint.user_id == user_id)
            .order_by(HardwareEndpoint.created_at.desc())
        )
    )


def get_for_user(db: Session, user_id, hardware_id) -> HardwareEndpoint | None:
    return db.scalar(
        select(HardwareEndpoint).where(
            HardwareEndpoint.id == hardware_id, HardwareEndpoint.user_id == user_id
        )
    )


def create(
    db: Session,
    user_id,
    name: str,
    base_url: str,
    description: str | None,
    auth_headers: dict | None,
    status: str,
) -> HardwareEndpoint:
    endpoint = HardwareEndpoint(
        user_id=user_id,
        name=name,
        base_url=base_url,
        description=description,
        auth_headers=auth_headers,
        status=status,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


def update(db: Session, endpoint: HardwareEndpoint, updates: dict) -> HardwareEndpoint:
    for key, value in updates.items():
        if value is not None or key == "auth_headers":
            setattr(endpoint, key, value)
    db.commit()
    db.refresh(endpoint)
    return endpoint


def delete(db: Session, endpoint: HardwareEndpoint) -> None:
    db.delete(endpoint)
    db.commit()
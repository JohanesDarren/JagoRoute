"""Hardware API Registry business logic (F-03)."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.hardware import HardwareEndpoint
from app.repositories import hardware_repo
from app.schemas.hardware import HardwareCreate, HardwareUpdate


def list_endpoints(db: Session, user_id) -> list[HardwareEndpoint]:
    return hardware_repo.list_for_user(db, user_id)


def create_endpoint(db: Session, user_id, payload: HardwareCreate) -> HardwareEndpoint:
    return hardware_repo.create(
        db,
        user_id,
        payload.name,
        payload.base_url,
        payload.description,
        payload.auth_headers,
        payload.status,
    )


def get_endpoint(db: Session, user_id, endpoint_id: str) -> HardwareEndpoint:
    endpoint = hardware_repo.get_for_user(db, user_id, endpoint_id)
    if endpoint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hardware endpoint not found.")
    return endpoint


def update_endpoint(db: Session, user_id, endpoint_id: str, payload: HardwareUpdate) -> HardwareEndpoint:
    endpoint = get_endpoint(db, user_id, endpoint_id)
    return hardware_repo.update(
        db, endpoint, payload.model_dump(exclude_unset=True, exclude_none=False)
    )


def delete_endpoint(db: Session, user_id, endpoint_id: str) -> None:
    endpoint = get_endpoint(db, user_id, endpoint_id)
    hardware_repo.delete(db, endpoint)
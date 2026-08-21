"""F-03: Hardware API Registry endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.hardware import HardwareCreate, HardwareOut, HardwareUpdate
from app.services import hardware_service
import httpx
import time

router = APIRouter(prefix="/hardware", tags=["hardware"])


@router.get("", response_model=list[HardwareOut])
def list_hardware(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[HardwareOut]:
    endpoints = hardware_service.list_endpoints(db, current_user.id)
    return [HardwareOut(**ep.public_dict()) for ep in endpoints]


@router.post("", response_model=HardwareOut, status_code=status.HTTP_201_CREATED)
def create_hardware(
    payload: HardwareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HardwareOut:
    endpoint = hardware_service.create_endpoint(db, current_user.id, payload)
    return HardwareOut(**endpoint.public_dict())


@router.get("/{hardware_id}", response_model=HardwareOut)
def get_hardware(
    hardware_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HardwareOut:
    return HardwareOut(**hardware_service.get_endpoint(db, current_user.id, hardware_id).public_dict())


@router.patch("/{hardware_id}", response_model=HardwareOut)
def update_hardware(
    hardware_id: str,
    payload: HardwareUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HardwareOut:
    endpoint = hardware_service.update_endpoint(db, current_user.id, hardware_id, payload)
    return HardwareOut(**endpoint.public_dict())


@router.delete("/{hardware_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hardware(
    hardware_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    hardware_service.delete_endpoint(db, current_user.id, hardware_id)


@router.post("/{hardware_id}/ping")
async def ping_hardware(
    hardware_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    endpoint = hardware_service.get_endpoint(db, current_user.id, hardware_id)
    start = time.perf_counter()
    url = endpoint.base_url.rstrip("/")
    headers = endpoint.auth_headers or {}
    params = endpoint.query_params or {}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            elapsed = int((time.perf_counter() - start) * 1000)
            return {
                "success": True,
                "status_code": resp.status_code,
                "response_time_ms": elapsed,
            }
    except httpx.HTTPError as exc:
        elapsed = int((time.perf_counter() - start) * 1000)
        return {
            "success": False,
            "status_code": 0,
            "response_time_ms": elapsed,
            "error": type(exc).__name__,
        }
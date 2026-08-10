"""F-05: API Key Manager endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyOut
from app.services import api_key_service


def _to_out(key) -> ApiKeyOut:
    return ApiKeyOut(
        id=str(key.id),
        name=key.name,
        key_prefix=key.key_prefix,
        last_used_at=key.last_used_at,
        revoked_at=key.revoked_at,
        created_at=key.created_at,
    )


router = APIRouter(prefix="/keys", tags=["keys"])


@router.get("", response_model=list[ApiKeyOut])
def list_keys(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ApiKeyOut]:
    return [_to_out(k) for k in api_key_service.list_keys(db, current_user.id)]


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyCreated:
    key, raw = api_key_service.generate_key(db, current_user.id, payload.name)
    return ApiKeyCreated(
        **(_to_out(key).model_dump()),
        key=raw,
    )


@router.delete("/{key_id}", response_model=ApiKeyOut)
def revoke_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyOut:
    return _to_out(api_key_service.revoke_key(db, current_user.id, key_id))
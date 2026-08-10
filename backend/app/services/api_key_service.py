"""API Key Manager business logic (F-05). Keys are shown once, only hashes stored."""
import hashlib
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.api_key import ApiKey
from app.repositories import api_key_repo

PREFIX = "jago_live_"


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_key(db: Session, user_id, name: str) -> tuple[ApiKey, str]:
    raw_key = PREFIX + secrets.token_urlsafe(32)
    api_key = api_key_repo.create(db, user_id, _sha256(raw_key), raw_key[:18], name)
    return api_key, raw_key


def list_keys(db: Session, user_id) -> list[ApiKey]:
    return api_key_repo.list_for_user(db, user_id)


def revoke_key(db: Session, user_id, key_id: str) -> ApiKey:
    api_key = api_key_repo.get_for_user(db, user_id, key_id)
    if api_key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
    if api_key.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key is already revoked.")
    return api_key_repo.revoke(db, api_key)


def authenticate(db: Session, raw_key: str) -> ApiKey | None:
    """Resolve a bearer token to an active ApiKey (or None)."""
    api_key = api_key_repo.get_by_hash(db, _sha256(raw_key))
    if api_key is None or api_key.revoked_at is not None:
        return None
    return api_key
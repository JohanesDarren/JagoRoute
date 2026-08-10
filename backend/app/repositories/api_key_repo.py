from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_key import ApiKey


def create(db: Session, user_id, key_hash: str, key_prefix: str, name: str) -> ApiKey:
    api_key = ApiKey(user_id=user_id, key_hash=key_hash, key_prefix=key_prefix, name=name)
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key


def list_for_user(db: Session, user_id) -> list[ApiKey]:
    return list(
        db.scalars(
            select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
        )
    )


def get_for_user(db: Session, user_id, key_id) -> ApiKey | None:
    return db.scalar(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
    )


def get_by_hash(db: Session, key_hash: str) -> ApiKey | None:
    return db.scalar(select(ApiKey).where(ApiKey.key_hash == key_hash))


def revoke(db: Session, api_key: ApiKey) -> ApiKey:
    api_key.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(api_key)
    return api_key


def touch_last_used(db: Session, api_key: ApiKey) -> None:
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()
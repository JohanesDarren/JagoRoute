"""Reusable FastAPI dependencies."""
import uuid  # noqa: F401   (kept for convenience in router signatures)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.api_key import ApiKey
from app.models.user import User
from app.repositories import user_repo
from app.services import api_key_service

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    subject = decode_token(credentials.credentials, expected_type="access")
    user = user_repo.get_by_id(db, subject) if subject else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")
    return user


def get_api_key_credentials(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None or not credentials.credentials.startswith("jago_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid JagoRoute API key required (Authorization: Bearer jago_live_...).",
        )
    return credentials.credentials


def get_api_key(
    raw_key: str = Depends(get_api_key_credentials),
    db: Session = Depends(get_db),
) -> ApiKey:
    api_key = api_key_service.authenticate(db, raw_key)
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked API key."
        )
    return api_key
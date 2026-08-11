"""Auth business logic: registration, login, token issuance/refresh."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.repositories import user_repo
from app.schemas.auth import TokenOut, UserOut


class DuplicateEmailError(Exception):
    pass


def register(db: Session, email: str, password: str, full_name: str | None) -> TokenOut:
    if user_repo.get_by_email(db, email) is not None:
        raise DuplicateEmailError("An account with this email already exists.")
    user = user_repo.create(db, email, hash_password(password), full_name)
    return _build_token_response(user)


def login(db: Session, email: str, password: str) -> TokenOut:
    user = user_repo.get_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")
    return _build_token_response(user)


def local_login(db: Session, password: str) -> TokenOut:
    """9router-style login: only the password is needed.

    Authenticates against the single locally-provisioned admin account
    (created on startup). Keeps the same user/workspace model under the hood.
    """
    from app.core.config import get_settings

    email = get_settings().ADMIN_EMAIL
    user = user_repo.get_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")
    return _build_token_response(user)


def refresh(db: Session, refresh_token: str) -> TokenOut:
    subject = decode_token(refresh_token, expected_type="refresh")
    user = user_repo.get_by_id(db, subject) if subject else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token."
        )
    return _build_token_response(user)


def _build_token_response(user) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )
"""Auth business logic: registration, login, token issuance/refresh."""
import logging
import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.repositories import user_repo
from app.schemas.auth import TokenOut, UserOut

logger = logging.getLogger("jagoroute")


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


DEFAULT_ADMIN_PASSWORD = "123456"


def _resolve_workspace_user(db: Session):
    """The account that owns the workspace. Prefers ADMIN_EMAIL (the configured
    local account) and falls back to the oldest existing account so a
    mismatched ADMIN_EMAIL on a host never locks you out of your data."""
    user = user_repo.get_by_email(db, get_settings().ADMIN_EMAIL)
    if user is None:
        user = user_repo.get_first_user(db)
    return user


def local_login(db: Session, password: str) -> TokenOut:
    """9router-style login: only the password is needed.

    The password is a local config value (ADMIN_PASSWORD, default 123456), so
    it is verified against the config directly instead of the stored hash. This
    keeps login working on any host even if the DB hash is stale (e.g. an old
    seed) or the startup sync hasn't run. The token is issued for the
    workspace-owning account so all existing data stays visible.

    Additionally, the documented default password (123456) is always accepted
    as a fallback (unless ADMIN_ALLOW_DEFAULT_FALLBACK=false), so a hosting
    agent that overrides ADMIN_PASSWORD can never lock you out of the router.
    """
    settings = get_settings()
    expected = settings.ADMIN_PASSWORD
    user = _resolve_workspace_user(db)

    ok = user is not None and secrets.compare_digest(password, expected)
    if not ok and settings.ADMIN_ALLOW_DEFAULT_FALLBACK:
        ok = user is not None and secrets.compare_digest(password, DEFAULT_ADMIN_PASSWORD)
        if ok and expected != DEFAULT_ADMIN_PASSWORD:
            logger.warning(
                "local-login: accepted default password for %s "
                "(ADMIN_PASSWORD is overridden). Set ADMIN_ALLOW_DEFAULT_FALLBACK=false to disable.",
                user.email,
            )
    if not ok:
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
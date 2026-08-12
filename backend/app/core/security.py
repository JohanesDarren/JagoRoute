"""Password hashing (bcrypt) and JWT token helpers."""
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt

from app.core.config import get_settings

# The documented dev default shipped in config.py / .env.example.
DEV_JWT_SECRET = "dev-secret-change-me-in-production"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _jwt_secret() -> str:
    """Resolve the JWT signing secret.

    Prefers an explicitly configured JWT_SECRET_KEY. When it's unset or still
    the documented dev default, a per-install random secret is generated once
    and persisted to JWT_SECRET_FILE so restarts keep the same tokens valid.
    """
    settings = get_settings()
    configured = (settings.JWT_SECRET_KEY or "").strip()
    if configured and configured != DEV_JWT_SECRET:
        return configured

    path = Path(settings.JWT_SECRET_FILE)
    if path.exists():
        stored = path.read_text(encoding="utf-8").strip()
        if stored:
            return stored

    secret = secrets.token_urlsafe(48)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(secret, encoding="utf-8")
    except OSError:
        pass  # can't persist (read-only fs) — secret still valid for this process
    return secret


def _create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str) -> str:
    return _create_token(
        subject,
        timedelta(minutes=get_settings().ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject,
        timedelta(days=get_settings().REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def decode_token(token: str, expected_type: str) -> str | None:
    """Return the subject (user id) if the token is valid and of expected type."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")
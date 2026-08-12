"""F-01: Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LocalLoginIn, RefreshIn, TokenOut, UserCreate, UserOut
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenOut:
    try:
        return auth_service.register(db, payload.email, payload.password, payload.full_name)
    except auth_service.DuplicateEmailError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=TokenOut)
def login(payload: UserCreate, db: Session = Depends(get_db)) -> TokenOut:
    return auth_service.login(db, payload.email, payload.password)


@router.post("/local-login", response_model=TokenOut)
def local_login(payload: LocalLoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Password-only login for the default local admin account."""
    return auth_service.local_login(db, payload.password)


@router.get("/local-config")
def local_config(db: Session = Depends(get_db)) -> dict:
    """Diagnostic (no secrets): which account does the password-only login
    target on this deployment, and does it exist in the DB?"""
    from app.core.config import get_settings
    from app.repositories import user_repo
    from app.services.auth_service import _resolve_workspace_user

    _settings = get_settings()
    configured = user_repo.get_by_email(db, _settings.ADMIN_EMAIL)
    workspace = _resolve_workspace_user(db)
    return {
        "admin_email": _settings.ADMIN_EMAIL,
        "admin_account_exists": configured is not None,
        "workspace_email": workspace.email if workspace else None,
        "workspace_account_exists": workspace is not None,
        "password_is_default": _settings.ADMIN_PASSWORD == "123456",
    }


@router.post("/refresh", response_model=TokenOut)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenOut:
    return auth_service.refresh(db, payload.refresh_token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
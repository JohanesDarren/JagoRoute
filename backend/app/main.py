"""JagoRoute API — FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine
from app import models  # noqa: F401  (register models on Base.metadata)
from app.api.v1.routers import auth, dashboard, gateway, hardware, keys, logs, mock_devices, routes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("jagoroute")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MVP: create tables on startup. Alembic is wired for future migrations.
    Base.metadata.create_all(bind=engine)
    # Self-healing schema guards for columns added after a table already exists
    # (create_all does not ALTER existing tables). Idempotent.
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE hardware_endpoints ADD COLUMN IF NOT EXISTS query_params JSON"))

    # 9router-style local install: the workspace account exists with the
    # configured password so you can sign in with just the password (123456 by
    # default, change via ADMIN_PASSWORD env / .env). The password is a local
    # config value and is re-synced on every start — predictable for a
    # single-tenant router, and it keeps all existing data visible.
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.repositories import user_repo
    from app.core.config import get_settings

    _settings = get_settings()
    if not (_settings.ADMIN_PASSWORD or "").strip():
        logger.warning(
            "ADMIN_PASSWORD is empty — login would be impossible. Set ADMIN_PASSWORD in .env or host env."
        )
    elif _settings.ADMIN_PASSWORD == "123456":
        logger.warning(
            "ADMIN_PASSWORD is still the documented default (123456). Set a real password — "
            "or ADMIN_ALLOW_DEFAULT_FALLBACK=false on a public host."
        )
    with SessionLocal() as db:
        # Sync target = ADMIN_EMAIL account, falling back to the oldest account
        # (the data owner) so a mismatched ADMIN_EMAIL on a host can't strand
        # your workspace. Same resolution as auth_service.local_login.
        from app.services.auth_service import _resolve_workspace_user

        workspace = _resolve_workspace_user(db)
        if workspace is None:
            workspace = user_repo.create(
                db, _settings.ADMIN_EMAIL, hash_password(_settings.ADMIN_PASSWORD), "Local Admin"
            )
            logger.info("Created local admin account: %s", _settings.ADMIN_EMAIL)
        else:
            user_repo.update_password(db, workspace, hash_password(_settings.ADMIN_PASSWORD))
            if workspace.email != _settings.ADMIN_EMAIL:
                logger.warning(
                    "ADMIN_EMAIL %s not found; using existing workspace account %s",
                    _settings.ADMIN_EMAIL,
                    workspace.email,
                )
            else:
                logger.info("Local admin synced: %s", _settings.ADMIN_EMAIL)

    logger.info("JagoRoute started · tables ensured")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Centralized IoT API management & routing platform — MVP",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(hardware.router, prefix=api_prefix)
app.include_router(routes.router, prefix=api_prefix)
app.include_router(keys.router, prefix=api_prefix)
app.include_router(logs.router, prefix=api_prefix)
app.include_router(gateway.router)  # uses its own /gateway/v1 prefix
app.include_router(mock_devices.router)  # demo-only: simulated hardware


@app.get("/api/v1/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}
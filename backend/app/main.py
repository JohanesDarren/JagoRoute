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
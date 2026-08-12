"""Pytest fixtures: in-memory SQLite app harness with dependency overrides."""
import os

# Pin a deterministic signing secret for tests (avoids generating/persisting
# a .jwt_secret file while the suite runs).
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-do-not-use-in-prod-0123456789abcdef")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture(autouse=True)
def _tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(_tables):
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
async def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# ---- Helpers -------------------------------------------------------------


async def register_user(
    client: AsyncClient,
    email: str = "halim@jago.io",
    password: str = "password123",
    full_name: str = "Halim",
):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth_headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def create_hardware(client: AsyncClient, tokens: dict, **overrides):
    payload = {
        "name": "ESP32 Sensor A",
        "base_url": "http://192.168.1.50:8080",
        "description": "Temp & humidity",
        "auth_headers": {},
        **overrides,
    }
    resp = await client.post("/api/v1/hardware", json=payload, headers=auth_headers(tokens))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_route(client: AsyncClient, tokens: dict, route_path: str, hardware_ids: list[str]):
    payload = {
        "route_path": route_path,
        "description": "demo route",
        "mappings": [
            {"hardware_id": h, "target_path": "/data", "method": "GET"} for h in hardware_ids
        ],
    }
    resp = await client.post("/api/v1/routes", json=payload, headers=auth_headers(tokens))
    assert resp.status_code == 201, resp.text
    return resp.json()


async def create_key(client: AsyncClient, tokens: dict, name: str = "Production Key"):
    resp = await client.post("/api/v1/keys", json={"name": name}, headers=auth_headers(tokens))
    assert resp.status_code == 201, resp.text
    return resp.json()
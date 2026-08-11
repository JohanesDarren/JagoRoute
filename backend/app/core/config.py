"""Application settings loaded from environment / .env file."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "JagoRoute API"
    API_V1_PREFIX: str = "/api/v1"
    GATEWAY_PREFIX: str = "/gateway/v1"

    DATABASE_URL: str = "postgresql+psycopg2://jago:jago@localhost:5432/jagoroute"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Local single-tenant login (9router-style): the app auto-creates/syncs
    # this account on start, and the UI only asks for the password.
    # It points at the workspace account so all existing data stays visible.
    ADMIN_EMAIL: str = "demo@jago.io"
    ADMIN_PASSWORD: str = "123456"

    GATEWAY_TIMEOUT_SECONDS: float = 3.0
    GATEWAY_RATE_LIMIT_PER_MINUTE: int = 120

    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
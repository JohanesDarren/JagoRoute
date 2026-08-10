"""Database engine, session factory and SQLAlchemy declarative base.

The generic ``Uuid`` / ``JSON`` column types keep models portable between
PostgreSQL (production) and SQLite (fast test runs).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


from sqlalchemy import Engine, create_engine


def _build_engine() -> Engine:
    """Return an engine, disabling the pool for SQLite (file/in-memory)."""
    url = get_settings().DATABASE_URL
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
    else:
        kwargs = {"pool_pre_ping": True}
    return create_engine(url, **kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """FastAPI dependency yielding a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
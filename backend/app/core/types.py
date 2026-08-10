"""Portable UUID column type.

Uses a native UUID on PostgreSQL and CHAR(32) on SQLite, while accepting both
``uuid.UUID`` objects and string values on bind — so lookups by string id
(common from path params / JWT subject) work on every dialect.
"""
import uuid

from sqlalchemy import Uuid
from sqlalchemy.types import TypeDecorator


class UUIDType(TypeDecorator):
    impl = Uuid
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and not isinstance(value, uuid.UUID):
            try:
                return uuid.UUID(str(value))
            except (ValueError, TypeError):
                return value
        return value
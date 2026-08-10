"""Redis helpers.

Redis is used for gateway rate limiting and short-lived route-mapping cache.
The client is wrapped so the application degrades gracefully when Redis is
unreachable (every helper returns a quiet default instead of raising).
"""
import json

import redis

from app.core.config import get_settings

_redis: "redis.Redis | None" = None
_redis_ok: bool = False


def get_redis() -> "redis.Redis | None":
    """Return a verified Redis client or ``None`` when unreachable."""
    global _redis, _redis_ok
    if _redis is None:
        try:
            _redis = redis.Redis.from_url(
                get_settings().REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
        except Exception:
            _redis = None
    try:
        _redis.ping()
        _redis_ok = True
    except Exception:
        _redis_ok = False
    return _redis if _redis_ok else None


def cache_get(key: str) -> str | None:
    client = get_redis()
    if client is None:
        return None
    try:
        return client.get(key)
    except Exception:
        return None


def cache_set(key: str, value: object, ttl_seconds: int = 30) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete_pattern(pattern: str) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        for key in client.scan_iter(match=pattern, count=100):
            client.delete(key)
    except Exception:
        pass


def is_rate_limited(key: str, limit_per_minute: int) -> bool:
    """Simple sliding-window-ish counter via INCR + EXPIRE. Returns True to block."""
    client = get_redis()
    if client is None:
        return False  # fail open when redis is down
    try:
        count = client.incr(key)
        if count == 1:
            client.expire(key, 60)
        return count > limit_per_minute
    except Exception:
        return False
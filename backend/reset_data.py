"""Reset workspace data to a clean, fresh-install state.

Deletes ALL hardware endpoints, routes, route mappings, API keys, and request
logs — but KEEPS user accounts (your login / password stay valid). Use this
before re-hosting, or whenever you want a clean slate without tearing down the
stack.

NOTE: a brand-new install is ALREADY clean — the app never auto-seeds demo
data. `seed.py` (demo bootstrap) only runs when you run it explicitly.

Run:  python reset_data.py              (uses DATABASE_URL / .env)
      docker compose exec backend python reset_data.py
"""
from sqlalchemy import delete

from app.core import redis_client
from app.core.database import SessionLocal
from app.models import ApiKey, HardwareEndpoint, RequestLog, Route, RouteMapping


def main() -> None:
    db = SessionLocal()
    try:
        # FK order matters: children before parents.
        targets = [
            (RequestLog, "request logs"),
            (ApiKey, "api keys"),
            (RouteMapping, "route mappings"),
            (Route, "routes"),
            (HardwareEndpoint, "hardware endpoints"),
        ]
        for model, label in targets:
            deleted = db.execute(delete(model)).rowcount
            print(f"  - {label}: {deleted} deleted")
        db.commit()
        # Drop the Redis gateway-route cache so deleted routes vanish immediately.
        redis_client.cache_delete_pattern("route:gateway:*")
        print("Done — workspace is clean (user accounts kept).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

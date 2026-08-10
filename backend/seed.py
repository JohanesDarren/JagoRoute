"""Seed demo data so the dashboard is immediately usable (and the gateway returns live data).

Run:  python seed.py            (uses DATABASE_URL / .env)
      docker compose exec backend python seed.py

Creates (idempotently):
  * demo user  demo@jago.io / demo1234
  * 3 hardware endpoints pointing at in-app mock devices (so routing "just works")
  * two unified routes: "all-sensors" and "system-status"
  * one API key (printed at the end)
"""
import uuid  # noqa: F401  (used by models at import time)

from app.core.database import Base, SessionLocal, engine
from app import models  # noqa: F401
from app.core.security import hash_password
from app.repositories import api_key_repo, hardware_repo, route_repo, user_repo
from app.services import api_key_service

DEMO_EMAIL = "demo@jago.io"
DEMO_PASSWORD = "demo1234"

# In-docker the backend reaches itself via the compose service name "backend".
MOCK_BASE = "http://backend:8000/mock-devices"

# name -> (base_url, description)
HARDWARE_DEFS = {
    "esp32_sensor_a": (
        f"{MOCK_BASE}/esp32",
        "ESP32 temperature & humidity (mock device)",
    ),
    "raspberry_pi_1": (
        f"{MOCK_BASE}/rpi",
        "Raspberry Pi CPU / stats monitor (mock device)",
    ),
    "ip_camera_1": (
        f"{MOCK_BASE}/camera",
        "IP camera stream API (mock device)",
    ),
}

ROUTE_DEFS = {
    "all-sensors": {
        "description": "Aggregated environment + system data",
        "mappings": [
            {"name": "esp32_sensor_a", "target_path": "/sensors", "method": "GET"},
            {"name": "raspberry_pi_1", "target_path": "/stats", "method": "GET"},
        ],
    },
    "system-status": {
        "description": "Infrastructure health from every device",
        "mappings": [
            {"name": "raspberry_pi_1", "target_path": "/stats", "method": "GET"},
            {"name": "ip_camera_1", "target_path": "/status", "method": "GET"},
        ],
    },
}


def _demo_user_id(db):
    return user_repo.get_by_email(db, DEMO_EMAIL).id


def _sync_hardware(db) -> dict[str, object]:
    existing = {h.name: h for h in hardware_repo.list_for_user(db, _demo_user_id(db))}
    synced: dict[str, object] = {}
    for name, (base_url, desc) in HARDWARE_DEFS.items():
        hw = existing.get(name)
        if hw is None:
            hw = hardware_repo.create(db, _demo_user_id(db), name, base_url, desc, {}, "active")
            print(f"+ hardware: {name}")
        else:
            if hw.base_url != base_url or hw.description != desc:
                hardware_repo.update(db, hw, {"base_url": base_url, "description": desc})
                print(f"~ hardware updated: {name}")
            else:
                print(f"= hardware ok: {name}")
        synced[name] = hw
    return synced


def _sync_routes(db, hardware: dict[str, object]) -> None:
    for path, spec in ROUTE_DEFS.items():
        route = route_repo.get_by_path(db, path)
        mappings = [
            {
                "hardware_id": hardware[m["name"]].id,
                "target_path": m["target_path"],
                "method": m["method"],
            }
            for m in spec["mappings"]
            if m["name"] in hardware
        ]
        if route is None:
            route = route_repo.create(db, _demo_user_id(db), path, spec["description"])
            print(f"+ route: {path}")
        else:
            print(f"= route ok: {path}")
        # Always reset demo mappings so reruns stay in sync with ROUTE_DEFS.
        route_repo.upsert_mappings(db, route, mappings)
        print(f"  -> {len(mappings)} device(s) mapped")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = user_repo.get_by_email(db, DEMO_EMAIL)
        if user is None:
            user = user_repo.create(db, DEMO_EMAIL, hash_password(DEMO_PASSWORD), "Demo IoT Engineer")
            print(f"+ user {DEMO_EMAIL}")
        else:
            print(f"= user ok ({DEMO_EMAIL})")

        hardware = _sync_hardware(db)
        _sync_routes(db, hardware)

        if not api_key_repo.list_for_user(db, _demo_user_id(db)):
            key, raw = api_key_service.generate_key(db, _demo_user_id(db), "Demo Key - .env integration")
            print()
            print("  --------------------------------------------------------")
            print("  New API key (copy it now):")
            print(f"    JAGO_ROUTE_API_KEY={raw}")
            print("  --------------------------------------------------------")
        else:
            print("= api key exists (manage it in the dashboard)")
    finally:
        db.close()
    print("\nSeed complete. Login: demo@jago.io / demo1234")


if __name__ == "__main__":
    main()
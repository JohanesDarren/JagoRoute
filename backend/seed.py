"""Seed demo data so the dashboard is immediately usable.

Run:  python seed.py            (uses DATABASE_URL / .env)
      docker compose exec backend python seed.py

Creates (idempotently):
  * demo user  demo@jago.io / demo1234
  * 3 hardware endpoints (ESP32, Raspberry Pi, IP Camera)
  * one unified route "all-sensors"
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


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = user_repo.get_by_email(db, DEMO_EMAIL)
        if user is None:
            user = user_repo.create(db, DEMO_EMAIL, hash_password(DEMO_PASSWORD), "Demo IoT Engineer")
            print(f"+ user {DEMO_EMAIL}")
        else:
            print(f"= user already exists ({DEMO_EMAIL})")

        esp32 = None
        existing = hardware_repo.list_for_user(db, user.id)
        by_name = {h.name: h for h in existing}

        hardware_defs = [
            {
                "name": "esp32_sensor_a",
                "base_url": "http://192.168.1.50:8080",
                "description": "ESP32 temperature & humidity (mock)",
                "auth_headers": {},
            },
            {
                "name": "raspberry_pi_1",
                "base_url": "http://192.168.1.60:8000",
                "description": "Raspberry Pi CPU / status monitor (mock)",
                "auth_headers": {},
            },
            {
                "name": "ip_camera_1",
                "base_url": "http://192.168.1.70:8080",
                "description": "IP camera stream API (mock)",
                "auth_headers": {"Authorization": "Basic YWRtaW46Y2FtZXJhMTIz"},
            },
        ]
        created: dict[str, object] = {}
        for spec in hardware_defs:
            if spec["name"] in by_name:
                created[spec["name"]] = by_name[spec["name"]]
                print(f"= hardware exists: {spec['name']}")
            else:
                hw = hardware_repo.create(
                    db,
                    user.id,
                    spec["name"],
                    spec["base_url"],
                    spec["description"],
                    spec["auth_headers"],
                    "active",
                )
                created[spec["name"]] = hw
                print(f"+ hardware: {spec['name']}")

        route = route_repo.get_by_path(db, "all-sensors")
        if route is None:
            esp32_id = created["esp32_sensor_a"].id
            rpi_id = created["raspberry_pi_1"].id
            route = route_repo.create(
                db, user.id, "all-sensors", "Aggregated environment + system data"
            )
            route_repo.upsert_mappings(
                db,
                route,
                [
                    {"hardware_id": esp32_id, "target_path": "/data", "method": "GET"},
                    {"hardware_id": rpi_id, "target_path": "/stats", "method": "GET"},
                ],
            )
            print("+ route: all-sensors (2 devices mapped)")
        else:
            print("= route exists: all-sensors")

        if not api_key_repo.list_for_user(db, user.id):
            key, raw = api_key_service.generate_key(db, user.id, "Demo Key - .env integration")
            print(f"+ api key for {DEMO_EMAIL}")
            print()
            print("  --------------------------------------------------------")
            print(f"  Add to your .env:")
            print(f"    JAGO_ROUTE_API_KEY={raw}")
            print(f"    JAGO_ROUTE_URL=http://localhost:8000/gateway/v1/all-sensors")
            print("  --------------------------------------------------------")
        else:
            print("= api keys already exist (see dashboard to manage them)")
    finally:
        db.close()
    print("\nSeed complete. Login: demo@jago.io / demo1234")


if __name__ == "__main__":
    main()
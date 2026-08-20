"""Seed demo data so the dashboard is immediately usable (and the gateway returns live data).

Run:  python seed.py            (uses DATABASE_URL / .env)
      docker compose exec backend python seed.py

NOTE: seed.py is a FRESH-INSTALL bootstrap. It creates/updates by name and
never deletes entries, so it does not migrate legacy renames (e.g. an old
"weather_station" hardware or "weather" route will just stay around).

Creates (idempotently):
  * workspace user (default demo@jago.io / 123456, from ADMIN_* settings)
  * 4 hardware endpoints:
      - soil_npk_sensor  -> BESTARI soil NPK sensor (full endpoint in base_url)
      - bmkg_weather     -> BMKG open-data weather forecast
      - bmkg_gempa       -> BMKG latest earthquake
      - Weather Mini Station -> Ecowitt WS2320CE (base_url only; credentials go
        in "Query params" via the dashboard or scripts/update-ecowitt-route.sh)
  * routes: "soil-npk", "bmkg-weather", "bmkg-gempa", "weather_station_only"
  * one API key (printed at the end)
"""
import uuid  # noqa: F401  (used by models at import time)

from app.core.database import Base, SessionLocal, engine
from app import models  # noqa: F401
from app.core.security import hash_password
from app.repositories import api_key_repo, hardware_repo, route_repo, user_repo
from app.services import api_key_service

from app.core.config import get_settings

_settings = get_settings()
DEMO_EMAIL = _settings.ADMIN_EMAIL
DEMO_PASSWORD = _settings.ADMIN_PASSWORD

# name -> (base_url, description)
HARDWARE_DEFS = {
    "soil_npk_sensor": (
        "https://api-soilsensor1.kolab.top/api/sensor/latest",
        "BESTARI soil NPK sensor - nitrogen, phosphorus, potassium, pH, moisture (full endpoint in base_url)",
    ),
    "bmkg_weather": (
        "https://api.bmkg.go.id/publik",
        "BMKG open data - prakiraan cuaca. Set adm4 in Query params (sumber: BMKG)",
    ),
    "bmkg_gempa": (
        "https://data.bmkg.go.id",
        "BMKG open data - gempabumi terbaru (sumber: BMKG)",
    ),
    "Weather Mini Station": (
        "https://api.ecowitt.net/api/v3",
        "Ecowitt WS2320CE - add lowercase query params application_key/api_key/mac",
    ),
}

ROUTE_DEFS = {
    "soil-npk": {
        "description": "Soil NPK sensor readings - nitrogen, phosphorus, potassium, pH, moisture",
        "mappings": [
            # base_url already contains the FULL endpoint; target_path is empty
            # so the gateway calls base_url exactly as stored (no suffix).
            {"name": "soil_npk_sensor", "target_path": "", "method": "GET"},
        ],
    },
    "bmkg-weather": {
        "description": "BMKG prakiraan cuaca - set adm4 (region) on bmkg_weather via Hardware -> Query params (sumber: BMKG)",
        "mappings": [
            {"name": "bmkg_weather", "target_path": "/prakiraan-cuaca", "method": "GET"},
        ],
    },
    "bmkg-gempa": {
        "description": "BMKG latest earthquake (autogempa.json) - sumber: BMKG",
        "mappings": [
            {"name": "bmkg_gempa", "target_path": "/DataMKG/TEWS/autogempa.json", "method": "GET"},
        ],
    },
    "weather_station_only": {
        "description": "Ecowitt weather station - live readings via /device/real_time",
        "mappings": [
            {"name": "Weather Mini Station", "target_path": "/device/real_time", "method": "GET"},
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
            hw = hardware_repo.create(db, _demo_user_id(db), name, base_url, desc, {}, {}, "active")
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
    print("\nSeed complete. Login:")
    print(f"  • Email: {DEMO_EMAIL}")
    print(f"  • Password: {DEMO_PASSWORD}  (password-only login also accepts just this)")


if __name__ == "__main__":
    main()

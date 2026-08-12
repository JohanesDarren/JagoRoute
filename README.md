# JagoRoute — IoT API Router

A centralized API management & routing platform for IoT hardware. IoT engineers
register raw device APIs, group them into unified **Routes**, and generate
**API keys** that the software team drops straight into their `.env`.

> **MVP scope (PRD v1.0):** Auth · Hardware API Registry · Route Builder ·
> API-Keys · Request Logs · Workspace Dashboard.

## JagoRoute vs 9router

9router is an AI API gateway — it proxies requests to one LLM provider at a time.
JagoRoute is an IoT hardware aggregator — it fans out to multiple devices and merges responses.

| Feature | 9router | JagoRoute |
|---|---|---|
| Purpose | Route AI/LLM requests | Aggregate IoT hardware APIs |
| Request flow | 1 → 1 (proxy) | 1 → N → 1 (fan-out + merge) |
| Response | LLM response as-is | Merged JSON: all devices in one payload |
| Error handling | Fail on provider error | Partial data: report what failed |
| Auth model | API key → provider key | API key → JWT (JagoRoute owns the key) |
| Caching | None | Route cache (Redis, 30s) |

## Architecture

```
┌──────────────────────────────┐
│  frontend/  Next.js 14 (App  │  React + Tailwind + Zustand + recharts
│             Router)          │
│        │ REST (JWT)          │
└────────┼─────────────────────┘
         ▼
┌──────────────────────────────┐
│  backend/  FastAPI           │  Clean architecture: routers → services → repos
│  /api/v1   dashboard ·       │  JWT auth, PostgreSQL (SQLAlchemy),
│            hardware · routes │  Redis (cache + rate limit), Alembic ready
│            keys · logs       │
│  /gateway/v1/{route_path}    │  Unified endpoint for the software team
└────────┬─────────────────────┘
         │  concurrent async httpx fan-out (3s timeout, partial data)
         ▼    ▼
   PostgreSQL  Redis
```

## Features (mapped to PRD)

| ID | Feature | Where |
|----|---------|-------|
| F-01 | Auth (register / login / refresh, JWT) | `backend/app/api/v1/routers/auth.py` · `frontend/app/login` |
| F-02 | Workspace Dashboard | `frontend/app/(dashboard)/dashboard` |
| F-03 | Hardware API Registry | `routers/hardware.py` · `frontend/app/(dashboard)/hardware` |
| F-04 | Route Builder | `routers/routes.py` · `frontend/app/(dashboard)/routes` |
| F-05 | API Key Manager (.env keys) | `routers/keys.py` · `frontend/app/(dashboard)/keys` |
| F-06 | Request Logs | `routers/logs.py` · `frontend/app/(dashboard)/logs` |
| —   | Gateway router (aggregation) | `services/gateway_service.py` · `routers/gateway.py` |

## Quick start (Docker)

```bash
# 1. Configure secrets (optional — safe dev defaults exist)
cp .env.example .env

# 2. Build & start postgres + redis + backend + frontend
docker compose up --build

# 3. Seed demo data (demo@jago.io / demo1234)
docker compose exec backend python seed.py
```

Open **http://localhost:3000** → log in → Hardware → Routes → API Keys.

## Local development (no Docker)

**Backend** (needs Python 3.11+):
```bash
cd backend
py -3.13 -m pip install -r requirements-dev.txt
copy .env.example .env        # set DATABASE_URL (Postgres or SQLite)
py -3.13 -m uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
copy .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
```

## Unified gateway endpoint (for the software team)

```bash
curl -H "Authorization: Bearer jago_live_..." \
     http://localhost:8000/gateway/v1/all-sensors
```

```json
{
  "status": "success",
  "route": "all-sensors",
  "data": {
    "esp32_sensor_a": { "status_code": 200, "data": { "temperature": 24.5, "humidity": 60 } },
    "raspberry_pi_1": { "status_code": 200, "data": { "cpu_load": "45%", "status": "online" } }
  }
}
```

If a device is unreachable, JagoRoute still returns `200` with a `"partial": true`
flag and that device marked `"error": "unreachable"` (strict 3s timeout).

## Testing

```bash
cd backend
py -3.13 -m pytest -q        # 20 tests — auth, hardware, routes, keys, gateway proxy
```

## Repository layout

```
JagoRoute/
├─ docker-compose.yml   # db + redis + backend + frontend
├─ backend/
│  ├─ app/
│  │  ├─ core/          # config, database, security, redis, types
│  │  ├─ models/        # SQLAlchemy models (users, hardware, routes, keys, logs)
│  │  ├─ schemas/       # Pydantic request/response contracts
│  │  ├─ repositories/  # data-access layer
│  │  ├─ services/      # business logic + gateway proxy
│  │  └─ api/v1/        # FastAPI routers + deps
│  ├─ alembic/          # migrations (wired; MVP uses create_all on startup)
│  ├─ tests/            # pytest suite
│  └─ seed.py           # demo data
└─ frontend/
   └─ app/              # Next.js 14 App Router pages
```

## Git workflow

```
main            (production)
develop         (staging)
feature/F-xx-desc
```

Conventional commits: `feat(router): add grouping capability`.

## Roadmap (post-MVP)

- MQTT / WebSocket routing (Phase 2)
- Advanced rate limiting + per-key quotas (Phase 2)
- Route-level retries & circuit breaking
- Analytics charts over longer windows
- Team / multi-user workspaces
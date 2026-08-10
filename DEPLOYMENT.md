# JagoRoute — Deployment Guide

How to run JagoRoute in staging/production.

## 1. Prerequisites

- Docker + Docker Compose
- A reachable network path to your IoT devices (same VPN, LAN, or public/tunneled
  IPs). See Section 5 — Hardware reachability.

## 2. Configuration

Copy `.env.example` → `.env` and set at minimum:

| Variable | Production advice |
|----------|-------------------|
| `JWT_SECRET_KEY` | **Generate a strong random value** — never the default. |
| `CORS_ORIGINS` | Comma-separated list of dashboard origins (e.g. `https://jago.internal`). |
| `GATEWAY_TIMEOUT_SECONDS` | Keep `3.0` or lower to bound software response latency. |
| `NEXT_PUBLIC_API_URL` | Public URL of the backend the browser can reach. |

Generate a secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 3. Build & run

```bash
docker compose up --build -d
docker compose ps                 # all services healthy?
docker compose exec backend python seed.py   # optional demo data
```

Health checks:
- Backend: `GET /api/v1/health` → `{"status":"ok"}`
- DB: `pg_isready` (compose healthcheck)
- Redis: `redis-cli ping` (compose healthcheck)

## 4. Reverse proxy / TLS

Put Nginx (or your edge) in front of the backend so the software team gets a clean
public URL for `/gateway/v1/*`:

```
location /gateway/v1/ { proxy_pass http://backend:8000; }
```

Terminate TLS there. The dashboard and gateway should be served over HTTPS in
production.

## 5. Hardware reachability (critical)

The backend **fan-outs to your devices' IPs/URLs directly**. For this to work:

- Devices must be reachable from the **backend container** network (not the browser).
- If devices are strictly local, connect the backend host to the same LAN/VPN, or
  expose devices via a tunnel (ngrok/Cloudflare) and register those public URLs.
- Firewall must allow egress from the backend to device ports.

The router is resilient: a device that times out (3s) or refuses connection results
in a `"partial": true` response, not a total failure.

## 6. Operations

- **Persistence:** Postgres data lives in the `pgdata` Docker volume. Back it up
  with `docker run --rm -v jagoroute_pgdata:/data alpine tar cf - /data`.
- **Upgrades / migrations:** MVP creates tables automatically. Once you add Alembic
  migrations, run `docker compose exec backend alembic upgrade head` before
  restarting.
- **Key rotation:** Revoke leaked keys from the dashboard — revocations take effect
  immediately (hash lookup).
- **Observability:** Watch `docker compose logs backend` for gateway errors and
  request-log failures.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Gateway returns `404` | Route path doesn't exist | Create the route in the dashboard |
| Gateway returns `401` | Invalid/revoked API key | Check `Bearer jago_live_...` |
| Data shows `"unreachable"` | Backend can't reach device | Check backend↔device network / timeout |
| Dashboard can't reach API | CORS or `NEXT_PUBLIC_API_URL` | Verify origins + env and rebuild frontend |
| 429 on gateway | Rate limit hit | Raise `GATEWAY_RATE_LIMIT_PER_MINUTE` if legitimate |
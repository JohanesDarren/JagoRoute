# JagoRoute — Deployment Guide (redeploy checklist)

How to deploy / re-deploy JagoRoute (frontend + backend) on a host.

## 1. Prerequisites

- Docker + Docker Compose (v2) on the host
- Ports free: **3000** (frontend), **8000** (backend), **5432** (Postgres), **6379** (Redis)
- A reachable network path from the **backend container** to your IoT devices
  (same LAN / VPN / tunnel). See §6.

## 2. One-command deploy (frontend + backend + db + redis)

```bash
git pull                       # get latest main (must include everything)
docker compose up -d --build   # build + start all services
docker compose ps              # all 4 services should be healthy/running
```

**No `.env` is required.** The frontend is built with relative URLs
(`/api/v1`, `/gateway/v1`) that are proxied by Next.js to the backend, so the
**same compose file works locally and on any domain**. Override only if you
need a special public URL:

```bash
# optional, only for custom setups:
# docker compose build --build-arg NEXT_PUBLIC_GATEWAY_URL=https://your-domain/gateway/v1 frontend
```

## 3. Verify after deploy

| Check | Expected |
|---|---|
| `curl -I https://<your-domain>/login` | `200` (login page with logo + install section) |
| Login with password `123456` | Works (dashboard opens) |
| `curl https://<your-domain>/api/v1/health` | `{"status":"ok",...}` |
| `curl -I https://<your-domain>/install.sh` | `200` (one-command installer script) |
| `curl https://<your-domain>/gateway/v1/<route>` + `Bearer jago_live_...` | JSON data (proxy works) |
| Fresh workspace | 0 hardware / 0 routes / 0 keys (clean by design) |

## 4. Host-only items to check (known issues)

1. **Root redirect 307 (route.jagoai.dev)** — the domain root currently returns a
   `307` with **no Location header** (broken). It's a Cloudflare/edge rule, not
   app code. Fix: remove/replace the redirect rule so `/` serves the app (or
   redirects to `/login` with a valid Location).
2. **Cloudflare caching** — `GET /logs*` already sends `Cache-Control: no-store`;
   don't enable aggressive caching for `/api/*` or `/gateway/*`.
3. **Optional hardening env** (in host `.env` or environment):
   - `JWT_SECRET_KEY` — generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - `ADMIN_PASSWORD` — custom password (default + fallback is `123456`)

## 5. Operations

- **Clean/reset a workspace** (keeps accounts, wipes hardware/routes/keys/logs):
  ```bash
  docker compose exec backend python reset_data.py
  ```
- **Demo data (optional)**: `docker compose exec backend python seed.py`
- **Backups**: Postgres lives in the `pgdata` volume:
  `docker run --rm -v jagoroute_pgdata:/data alpine tar cf - /data`
- **Upgrades**: `git pull && docker compose up -d --build`

## 6. Hardware reachability (critical)

The backend fan-outs to device URLs **from the backend container** (not the
browser). Devices must be reachable from that container's network, or exposed
via tunnel (ngrok/Cloudflare) with those public URLs registered as
`base_url`. A failing device yields `"partial": true`, not a total failure.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Gateway returns `404` | Route path doesn't exist | Create route in dashboard |
| Gateway returns `401` | Invalid/revoked API key | Use valid `Bearer jago_live_...` |
| Data shows `"unreachable"` | Backend can't reach device | Check backend↔device network / timeout |
| Dashboard API broken on host | Stale frontend build (old absolute `localhost` URLs) | Rebuild with latest code: `docker compose up -d --build frontend` |
| Login rejected on host | Stale account hash | Use `123456` — login verifies against configured password, not the DB hash |
| 429 on gateway | Rate limit hit | Raise `GATEWAY_RATE_LIMIT_PER_MINUTE` if legitimate |

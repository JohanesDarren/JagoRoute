#!/usr/bin/env bash
# JagoRoute — start the LOCAL (no Docker) stack: backend (uvicorn) + frontend (Next.js).
#
# Usage (from the repo root):
#   bash scripts/start-local.sh          # start backend + frontend
#   bash scripts/start-local.sh stop     # stop both
#
# Logs are written to /tmp/jagoroute-backend.log and /tmp/jagoroute-frontend.log.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/scripts/.local.pids"
BACK_LOG="/tmp/jagoroute-backend.log"
FRONT_LOG="/tmp/jagoroute-frontend.log"

stop_all() {
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      [ -z "$pid" ] && continue
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null && echo "✓ Stopped PID $pid"
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  echo "✓ Local JagoRoute stopped"
}

if [ "${1:-}" = "stop" ]; then
  stop_all
  exit 0
fi

# ── 1. Backend ────────────────────────────────────────────────────────
echo "→ Preparing backend (Python)..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null || true

# Seed demo data (idempotent — safe to run every start).
python seed.py 2>/dev/null || true

echo "→ Starting backend on http://localhost:8000 ..."
nohup uvicorn app.main:app --port 8000 > "$BACK_LOG" 2>&1 &
echo $! > "$PID_FILE"

# ── 2. Frontend ───────────────────────────────────────────────────────
echo "→ Preparing frontend (Node)..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install 2>&1 | tail -2
fi

echo "→ Starting frontend on http://localhost:3000 ..."
nohup npm run dev > "$FRONT_LOG" 2>&1 &
echo $! >> "$PID_FILE"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   JagoRoute is running (LOCAL — no Docker)║"
echo "║   Open:  http://localhost:3000           ║"
echo "║   Login: 123456                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Stop: bash scripts/start-local.sh stop"
echo "  Backend log:  tail -f $BACK_LOG"
echo "  Frontend log: tail -f $FRONT_LOG"
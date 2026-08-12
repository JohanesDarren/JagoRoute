#!/usr/bin/env bash
# JagoRoute — one-command install (macOS / Linux)
# Usage: curl -s https://route.jagoai.dev/install.sh | bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       JagoRoute — IoT API Router     ║${NC}"
echo -e "${CYAN}║          One-Command Install          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Check prerequisites
echo -e "→ Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo -e "${RED}✗ Docker is not installed.${NC}"
  echo "  Install Docker Desktop: https://docs.docker.com/get-docker/"
  exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! docker compose version &>/dev/null; then
  echo -e "${RED}✗ docker compose plugin not found.${NC}"
  echo "  Docker Compose comes with Docker Desktop. If you're on Linux, install it separately:"
  echo "  https://docs.docker.com/compose/install/"
  exit 1
fi
echo -e "${GREEN}✓ docker compose found${NC}"

# 2. Check Git
echo -e "→ Checking Git..."
if ! command -v git &>/dev/null; then
  echo -e "${RED}✗ Git is not installed.${NC}"
  echo "  Install: https://git-scm.com/downloads"
  exit 1
fi
echo -e "${GREEN}✓ Git found${NC}"

# 3. Clone repo
REPO="https://github.com/JohanesDarren/JagoRoute.git"
DIR="JagoRoute"

if [ -d "$DIR" ]; then
  echo -e "→ JagoRoute directory exists, pulling latest..."
  cd "$DIR"
  git pull --ff-only 2>/dev/null || true
  echo -e "${GREEN}✓ Updated${NC}"
else
  echo -e "→ Cloning JagoRoute..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
  echo -e "${GREEN}✓ Cloned${NC}"
fi

# 4. Set environment (optional)
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
fi

# 5. Start
echo -e "→ Starting JagoRoute..."
docker compose up -d --build --quiet-pull 2>&1

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      JagoRoute is running!           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  Open:  http://localhost:3000        ║${NC}"
echo -e "${GREEN}║  Login: 123456                       ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}║  Seed demo data:                     ║${NC}"
echo -e "${GREEN}║  docker compose exec backend \\       ║${NC}"
echo -e "${GREEN}║    python seed.py                    ║${NC}"
echo -e "${GREEN}║                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
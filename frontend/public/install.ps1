# JagoRoute — one-command install (Windows PowerShell)
# Usage: irm https://route.jagoai.dev/install.ps1 | iex
# Or:    curl -s https://route.jagoai.dev/install.ps1 | powershell -

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       JagoRoute — IoT API Router     ║" -ForegroundColor Cyan
Write-Host "║          One-Command Install          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker
Write-Host "→ Checking Docker..." -ForegroundColor Cyan
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "✗ Docker is not installed." -ForegroundColor Red
    Write-Host "  Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}
Write-Host "✓ Docker found" -ForegroundColor Green

# 2. Check Git
Write-Host "→ Checking Git..." -ForegroundColor Cyan
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "✗ Git is not installed." -ForegroundColor Red
    Write-Host "  Install: https://git-scm.com/downloads/win"
    exit 1
}
Write-Host "✓ Git found" -ForegroundColor Green

# 3. Clone repo
$repo = "https://github.com/JohanesDarren/JagoRoute.git"
$dir = "JagoRoute"

if (Test-Path $dir) {
    Write-Host "→ JagoRoute directory exists, pulling latest..."
    Set-Location $dir
    git pull --ff-only *>$null
    Write-Host "✓ Updated" -ForegroundColor Green
} else {
    Write-Host "→ Cloning JagoRoute..."
    git clone $repo $dir
    Set-Location $dir
    Write-Host "✓ Cloned" -ForegroundColor Green
}

# 4. Set environment (optional)
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
}

# 5. Start
Write-Host "→ Starting JagoRoute..."
docker compose up -d --build --quiet-pull

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      JagoRoute is running!           ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                      ║" -ForegroundColor Green
Write-Host "║  Open:  http://localhost:3000        ║" -ForegroundColor Green
Write-Host "║  Login: 123456                       ║" -ForegroundColor Green
Write-Host "║                                      ║" -ForegroundColor Green
Write-Host "║  Seed demo data:                     ║" -ForegroundColor Green
Write-Host "║  docker compose exec backend \       ║" -ForegroundColor Green
Write-Host "║    python seed.py                    ║" -ForegroundColor Green
Write-Host "║                                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
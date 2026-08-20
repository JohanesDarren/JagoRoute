# JagoRoute — start the LOCAL (no Docker) stack: backend (uvicorn) + frontend (Next.js).
#
# Usage (from the repo root):
#   .\scripts\start-local.ps1            # start backend + frontend
#   .\scripts\start-local.ps1 stop       # stop both
#
# Logs are written to scripts\backend.log / scripts\frontend.log / *.err.log.

param([string]$Action = "start")

$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root "scripts\.local.pids"

function Stop-All {
    if (Test-Path $PidFile) {
        Get-Content $PidFile -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_ -match '^\d+$') {
                Stop-Process -Id ([int]$_) -Force -ErrorAction SilentlyContinue
                Write-Host "  Stopped PID $_" -ForegroundColor Green
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Local JagoRoute stopped" -ForegroundColor Green
}

if ($Action -eq "stop") {
    Stop-All
    exit 0
}

# ── 1. Backend ────────────────────────────────────────────────────────
Write-Host "→ Preparing backend (Python)..." -ForegroundColor Cyan
Set-Location (Join-Path $Root "backend")
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".venv\Scripts\Activate.ps1"
python -m pip install -q -r requirements.txt 2>$null

# Seed demo data (idempotent — safe to run every start).
python seed.py 2>$null

Write-Host "→ Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
$back = Start-Process `
    -FilePath ".venv\Scripts\pythonw.exe" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "8000" `
    -WorkingDirectory (Get-Location) `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$Root\scripts\backend.log" `
    -RedirectStandardError "$Root\scripts\backend.err.log"
"$($back.Id)" | Out-File -FilePath $PidFile -Encoding ascii

# ── 2. Frontend ───────────────────────────────────────────────────────
Write-Host "→ Preparing frontend (Node)..." -ForegroundColor Cyan
Set-Location (Join-Path $Root "frontend")
if (-not (Test-Path "node_modules")) {
    npm install 2>$null
}

Write-Host "→ Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
$front = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory (Get-Location) `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$Root\scripts\frontend.log" `
    -RedirectStandardError "$Root\scripts\frontend.err.log"
# Append frontend PID on its own line.
$front.Id | Out-File -FilePath $PidFile -Append -Encoding ascii

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   JagoRoute is running (LOCAL — no Docker)║" -ForegroundColor Green
Write-Host "║   Open:  http://localhost:3000           ║" -ForegroundColor Green
Write-Host "║   Login: 123456                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Stop: .\scripts\start-local.ps1 stop" -ForegroundColor Cyan
Write-Host "  Backend log:  scripts\backend.log" -ForegroundColor Gray
Write-Host "  Frontend log: scripts\frontend.log" -ForegroundColor Gray
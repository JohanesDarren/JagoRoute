# jagoroute

One-command **JagoRoute** — self-host your own IoT API router locally.

```bash
npx -y jagoroute
```

That's it. It clones the JagoRoute repo, starts the stack, and prints the URL.

The `jagorouter` command is the global install form:

```bash
npm i -g jagoroute
jagorouter            # start
jagorouter stop       # stop the stack
```

## Usage

| Command | What it does |
|---|---|
| `npx -y jagoroute` | Clone (if needed) + start the stack (default) |
| `jagorouter stop` | Stop the stack |
| `jagorouter logs` | Follow backend logs |
| `jagorouter status` | Show container status |
| `jagorouter update` | Pull latest + rebuild + restart |

## Requirements

- **Node.js** (>= 16) — this CLI itself
- **Docker** with the compose plugin
- **Git**

## Details

- Installs into `~/jagorouter` by default (override with `JAGOROUTER_DIR`).
- Creates `.env` from `.env.example` on first run (safe defaults).
- Runs `docker compose up -d --build` — open http://localhost:3000, password `123456`.
- The app starts **empty** (no demo data). Optionally seed demo data:
  `docker compose exec backend python seed.py`

## No-Node alternatives

```bash
# macOS / Linux
curl -s https://raw.githubusercontent.com/JohanesDarren/JagoRoute/main/frontend/public/install.sh | bash
# Windows PowerShell
irm https://raw.githubusercontent.com/JohanesDarren/JagoRoute/main/frontend/public/install.ps1 | iex
```

#!/usr/bin/env node
"use strict";

/**
 * jagorouter — one-command JagoRoute (self-hosted IoT API router).
 *
 * Usage:
 *   jagorouter            start (default): clone/update + docker compose up
 *   jagorouter stop       stop the stack
 *   jagorouter logs       follow backend logs
 *   jagorouter status     show container status
 *   jagorouter update     git pull + rebuild + restart
 *
 * Requires: Node.js (this CLI), Docker with the compose plugin, and Git.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO = "https://github.com/JohanesDarren/JagoRoute.git";
const HOME = os.homedir();
let DIR;

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function hasComposeFile(dir) {
  return fs.existsSync(path.join(dir, "docker-compose.yml"));
}

/** Existing installs are probed so curl/ps1-installed users work too. */
function findExistingDir() {
  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "JagoRoute"),
    path.join(HOME, "jagorouter"),
    path.join(HOME, "JagoRoute"),
  ];
  for (const c of candidates) {
    if (hasComposeFile(c)) return c;
  }
  return null;
}

function resolveDir(forStart) {
  if (process.env.JAGOROUTER_DIR) return process.env.JAGOROUTER_DIR;
  if (!forStart) {
    const found = findExistingDir();
    if (found) return found;
  }
  return path.join(HOME, "jagorouter");
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", shell: true }).trim();
  } catch {
    return "";
  }
}

function safePull() {
  // Fresh clones have no tracking branch (pull always fails) — never abort.
  try {
    execSync("git pull --ff-only", { cwd: DIR, stdio: "inherit", shell: true });
  } catch {
    /* ignore: nothing to pull, or dirty tree */
  }
}

function compose(args) {
  try {
    execSync(`docker compose ${args}`, { cwd: DIR, stdio: "inherit", shell: true });
  } catch {
    console.error(`${RED}✗ docker compose failed.${RESET}`);
    console.error("  Check Docker is running and ports 3000/8000 are free.");
    process.exit(1);
  }
}

function checkPrereqs() {
  if (!sh("docker --version")) {
    console.error(
      `${RED}✗ Docker is not installed or not in PATH.${RESET}\n  Install Docker Desktop: https://docs.docker.com/get-docker/`
    );
    process.exit(1);
  }
  if (!sh("docker compose version")) {
    console.error(
      `${RED}✗ docker compose plugin not found.${RESET}\n  Install: https://docs.docker.com/compose/install/`
    );
    process.exit(1);
  }
}

function banner() {
  console.log("");
  console.log(`${CYAN}╔══════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║         JagoRoute is running!         ║${RESET}`);
  console.log(`${CYAN}╠══════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║  Open:  http://localhost:3000        ║${RESET}`);
  console.log(`${CYAN}║  Login: 123456                       ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════╝${RESET}`);
  console.log("");
  console.log("Stop:   jagorouter stop");
  console.log("Logs:   jagorouter logs");
  console.log("");
}

const cmd = process.argv[2] || "start";

switch (cmd) {
  case "start": {
    checkPrereqs();
    DIR = resolveDir(true);
    if (fs.existsSync(DIR) && fs.readdirSync(DIR).length > 0 && !hasComposeFile(DIR)) {
      console.error(`${RED}✗ ${DIR} exists but is not a JagoRoute checkout.${RESET}`);
      console.error("  Set JAGOROUTER_DIR to an empty/valid folder and retry.");
      process.exit(1);
    }
    fs.mkdirSync(DIR, { recursive: true });
    if (!hasComposeFile(DIR)) {
      console.log(`→ Cloning JagoRoute into ${DIR} ...`);
      execSync(`git clone "${REPO}" "${DIR}"`, { stdio: "inherit", shell: true });
    } else {
      console.log(`→ Found JagoRoute in ${DIR} ...`);
    }
    const envFile = path.join(DIR, ".env");
    if (!fs.existsSync(envFile)) {
      fs.copyFileSync(path.join(DIR, ".env.example"), envFile);
    }
    safePull();
    console.log("→ Starting JagoRoute ...");
    compose("up -d --build");
    banner();
    break;
  }
  case "stop":
    DIR = resolveDir(false);
    if (!hasComposeFile(DIR)) {
      console.error(`${RED}✗ JagoRoute not installed (no docker-compose.yml found).${RESET}`);
      process.exit(1);
    }
    compose("stop");
    break;
  case "logs":
    DIR = resolveDir(false);
    if (!hasComposeFile(DIR)) {
      console.error(`${RED}✗ JagoRoute not installed (no docker-compose.yml found).${RESET}`);
      process.exit(1);
    }
    compose("logs -f");
    break;
  case "status":
    DIR = resolveDir(false);
    if (!hasComposeFile(DIR)) {
      console.error(`${RED}✗ JagoRoute not installed (no docker-compose.yml found).${RESET}`);
      process.exit(1);
    }
    compose("ps");
    break;
  case "update":
    checkPrereqs();
    DIR = resolveDir(false);
    if (!hasComposeFile(DIR)) {
      console.error(`${RED}✗ JagoRoute not installed (no docker-compose.yml found).${RESET}`);
      process.exit(1);
    }
    safePull();
    compose("up -d --build");
    console.log(`${GREEN}✓ Updated.${RESET}`);
    break;
  case "help":
  case "--help":
  case "-h":
    console.log(
      [
        "jagorouter — one-command JagoRoute",
        "",
        "  jagorouter            start (default): clone/update + docker compose up",
        "  jagorouter stop       stop the stack",
        "  jagorouter logs       follow backend logs",
        "  jagorouter status     show container status",
        "  jagorouter update     git pull + rebuild + restart",
        "",
        "Requires: Node.js, Docker with compose plugin, Git.",
        "Env: JAGOROUTER_DIR (default ~/jagorouter)",
      ].join("\n")
    );
    break;
  default:
    console.error(`${RED}Unknown command: ${cmd}${RESET}`);
    console.error("Try: jagorouter (start) | stop | logs | status | update | help");
    process.exit(1);
}

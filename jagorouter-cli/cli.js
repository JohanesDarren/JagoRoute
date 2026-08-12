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
const DIR =
  process.env.JAGOROUTER_DIR ||
  path.join(os.homedir(), "jagorouter");

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", shell: true });
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", shell: true }).trim();
  } catch {
    return "";
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

function hasComposeFile() {
  return fs.existsSync(path.join(DIR, "docker-compose.yml"));
}

function ensureRepo() {
  if (hasComposeFile()) return;
  if (fs.existsSync(DIR) && fs.readdirSync(DIR).length > 0 && !hasComposeFile()) {
    console.error(
      `${RED}✗ ${DIR} exists but is not a JagoRoute checkout.${RESET}`
    );
    console.error("  Set JAGOROUTER_DIR to an empty/valid folder and retry.");
    process.exit(1);
  }
  fs.mkdirSync(DIR, { recursive: true });
  console.log(`→ Cloning JagoRoute into ${DIR} ...`);
  run(`git clone "${REPO}" "${DIR}"`);
}

function ensureEnv() {
  const envFile = path.join(DIR, ".env");
  const example = path.join(DIR, ".env.example");
  if (!fs.existsSync(envFile) && fs.existsSync(example)) {
    fs.copyFileSync(example, envFile);
  }
}

function checkPrereqs() {
  const docker = sh("docker --version");
  if (!docker) {
    console.error(
      `${RED}✗ Docker is not installed or not in PATH.${RESET}\n  Install Docker Desktop: https://docs.docker.com/get-docker/`
    );
    process.exit(1);
  }
  const compose = sh("docker compose version");
  if (!compose) {
    console.error(
      `${RED}✗ docker compose plugin not found.${RESET}\n  Install: https://docs.docker.com/compose/install/`
    );
    process.exit(1);
  }
}

const cmd = process.argv[2] || "start";

switch (cmd) {
  case "start":
    checkPrereqs();
    ensureRepo();
    ensureEnv();
    console.log(`→ Starting JagoRoute in ${DIR} ...`);
    run(`cd "${DIR}" && (git pull --ff-only 2>nul || git pull --ff-only 2>/dev/null || true) && docker compose up -d --build`);
    banner();
    break;
  case "stop":
    if (!hasComposeFile()) {
      console.error(`${RED}✗ JagoRoute not installed in ${DIR}.${RESET}`);
      process.exit(1);
    }
    run(`cd "${DIR}" && docker compose stop`);
    break;
  case "logs":
    if (!hasComposeFile()) {
      console.error(`${RED}✗ JagoRoute not installed in ${DIR}.${RESET}`);
      process.exit(1);
    }
    run(`cd "${DIR}" && docker compose logs -f`);
    break;
  case "status":
    if (!hasComposeFile()) {
      console.error(`${RED}✗ JagoRoute not installed in ${DIR}.${RESET}`);
      process.exit(1);
    }
    run(`cd "${DIR}" && docker compose ps`);
    break;
  case "update":
    checkPrereqs();
    if (!hasComposeFile()) {
      console.error(`${RED}✗ JagoRoute not installed in ${DIR}.${RESET}`);
      process.exit(1);
    }
    run(`cd "${DIR}" && git pull --ff-only && docker compose up -d --build`);
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

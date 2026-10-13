#!/usr/bin/env bash
# Cloud Agent `install` phase for crm-lab (also usable on any Ubuntu 24.04 box).
#
# Produces files only; starts no long-running service (that is start.sh).
# Idempotent and non-interactive. Needs passwordless sudo for apt.
#
# Steps:
#   1. Node.js (pinned in .nvmrc) via scripts/cloud/install-node.sh
#   2. System packages: PostgreSQL 16, git, curl, build tools, jq
#   3. npm ci (next, prisma, rea-agents@6.4.0, playwright, @playwright/test)
#   4. Playwright Chromium + its system dependencies
#   5. .env from .env.example when missing (local dev credentials, not secrets)
#   6. prisma generate
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export DEBIAN_FRONTEND=noninteractive

log() { printf '\n[install] %s\n' "$*"; }

log "1/6 Node.js"
bash scripts/cloud/install-node.sh
# shellcheck disable=SC1091
source scripts/cloud/env.sh
node --version
npm --version

log "2/6 System packages"
PACKAGES=(ca-certificates curl git build-essential jq unzip xz-utils postgresql postgresql-contrib)
MISSING=()
for pkg in "${PACKAGES[@]}"; do
  dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q "install ok installed" || MISSING+=("$pkg")
done
if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "Installing: ${MISSING[*]}"
  sudo apt-get update -qq
  sudo apt-get install -y -qq --no-install-recommends "${MISSING[@]}"
else
  echo "All system packages already installed."
fi
# apt starts PostgreSQL on first install; installs must not leave daemons running.
if command -v pg_lsclusters >/dev/null 2>&1 && pg_lsclusters -h 2>/dev/null | grep -q online; then
  sudo service postgresql stop || true
fi

log "3/6 npm ci"
npm ci --no-audit --no-fund

log "4/6 Playwright Chromium (+ system deps)"
npx playwright install --with-deps chromium

log "5/6 .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (local dev values)."
else
  echo ".env already present; left untouched."
fi

log "6/6 Prisma client"
npx prisma generate

log "Done. Next: bash scripts/cloud/start.sh, then bash scripts/cloud/verify.sh"

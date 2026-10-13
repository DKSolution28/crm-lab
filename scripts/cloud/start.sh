#!/usr/bin/env bash
# Cloud Agent `start` phase for crm-lab: runs detached on every VM boot.
#
# Brings up (idempotently, in this order):
#   1. PostgreSQL 16 (system service) and waits for readiness
#   2. Database role/db + Prisma migrations + demo seed (scripts/cloud/db-setup.sh)
#   3. Chromium with a loopback CDP endpoint (scripts/start-cdp-browser.sh)
#   4. Next.js dev server in a tmux session named `dev-server` (port 3000)
#
# Returns once the dev server answers /api/health, so a `0` exit status in
# /tmp/cursor/start-user/start-user.status means everything is up.
# Logs: /tmp/crm-lab-dev-server.log, /tmp/crm-lab-cdp-browser.log
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/cloud/env.sh

log() { printf '\n[start] %s\n' "$*"; }

log "1/4 PostgreSQL"
if ! pg_isready -q 2>/dev/null; then
  sudo service postgresql start
fi
for _ in $(seq 1 30); do
  pg_isready -q && break
  sleep 1
done
pg_isready || { echo "PostgreSQL did not become ready" >&2; exit 1; }

log "2/4 Database schema + seed"
bash scripts/cloud/db-setup.sh

log "3/4 CDP browser"
bash scripts/start-cdp-browser.sh || echo "[start] WARNING: CDP browser failed to start (non-fatal)"

log "4/4 Next.js dev server (tmux session: dev-server)"
DEV_LOG=/tmp/crm-lab-dev-server.log
if curl -fsS "$CRM_LAB_BASE_URL/api/health" >/dev/null 2>&1; then
  echo "Dev server already answering on $CRM_LAB_BASE_URL"
else
  if crm_lab_tmux has-session -t dev-server 2>/dev/null; then
    echo "tmux session dev-server exists but server not answering; restarting it"
    crm_lab_tmux kill-session -t dev-server
  fi
  crm_lab_tmux new-session -d -s dev-server -c "$ROOT" \
    "source scripts/cloud/env.sh && npm run dev -- --hostname 0.0.0.0 --port $CRM_LAB_DEV_PORT 2>&1 | tee $DEV_LOG"
  echo "Waiting for $CRM_LAB_BASE_URL/api/health ..."
  for _ in $(seq 1 120); do
    if curl -fsS "$CRM_LAB_BASE_URL/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if curl -fsS "$CRM_LAB_BASE_URL/api/health"; then
  echo
  log "Ready: app $CRM_LAB_BASE_URL · CDP $CRM_LAB_CDP_URL · dev log $DEV_LOG"
else
  echo "Dev server did not answer within 120s; see $DEV_LOG" >&2
  exit 1
fi

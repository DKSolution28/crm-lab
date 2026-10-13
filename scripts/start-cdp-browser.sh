#!/usr/bin/env bash
# Per-boot Cloud Agent start: PostgreSQL, Next.js, and a Chrome-family CDP browser.
# Idempotent. Uses tmux for long-running processes and returns after readiness.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/toolchain.sh
source "${ROOT}/scripts/lib/toolchain.sh"
prefer_usr_local_node

log() {
  printf '[cloud-start] %s\n' "$*"
}

ensure_postgres_running() {
  if ! command -v pg_isready >/dev/null 2>&1; then
    log "PostgreSQL is not installed; skip database start"
    return 0
  fi
  if pg_isready -q; then
    log "PostgreSQL already ready"
  else
    log "Starting PostgreSQL"
    sudo service postgresql start
    local i=0
    until pg_isready -q; do
      i=$((i + 1))
      if [[ "${i}" -gt 30 ]]; then
        log "PostgreSQL did not become ready"
        return 1
      fi
      sleep 1
    done
  fi
}

ensure_local_database() {
  if ! command -v psql >/dev/null 2>&1; then
    return 0
  fi
  if ! pg_isready -q; then
    return 0
  fi
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${CRM_LAB_DB_USER}'" | grep -q 1; then
    log "Role ${CRM_LAB_DB_USER} exists"
  else
    log "Creating local role ${CRM_LAB_DB_USER}"
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
      -c "CREATE ROLE ${CRM_LAB_DB_USER} LOGIN PASSWORD '${CRM_LAB_DB_PASSWORD}' SUPERUSER;"
  fi
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${CRM_LAB_DB_NAME}'" | grep -q 1; then
    log "Database ${CRM_LAB_DB_NAME} exists"
  else
    log "Creating local database ${CRM_LAB_DB_NAME}"
    sudo -u postgres createdb -O "${CRM_LAB_DB_USER}" "${CRM_LAB_DB_NAME}"
  fi
}

sync_prisma_schema() {
  if [[ ! -f "${ROOT}/prisma/schema.prisma" ]]; then
    return 0
  fi
  if ! pg_isready -q; then
    return 0
  fi
  cd "${ROOT}"
  export DATABASE_URL="${CRM_LAB_DATABASE_URL}"
  log "Applying Prisma schema"
  npx prisma db push --skip-generate
}

start_next_dev() {
  if [[ ! -f "${ROOT}/package.json" ]]; then
    log "No package.json yet; skip Next.js"
    return 0
  fi
  if curl -sf "http://127.0.0.1:${CRM_LAB_APP_PORT}" >/dev/null 2>&1; then
    log "Next.js already responding on :${CRM_LAB_APP_PORT}"
    return 0
  fi
  if tmux has-session -t next-dev 2>/dev/null; then
    log "tmux session next-dev already exists"
  else
    log "Starting Next.js on :${CRM_LAB_APP_PORT}"
    tmux new-session -d -s next-dev \
      "cd '${ROOT}' && export PATH='/usr/local/bin:${PATH}' DATABASE_URL='${CRM_LAB_DATABASE_URL}' && npm run dev -- --hostname 0.0.0.0 --port ${CRM_LAB_APP_PORT} 2>&1 | tee /tmp/next-dev.log"
  fi
  local i=0
  until curl -sf "http://127.0.0.1:${CRM_LAB_APP_PORT}" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ "${i}" -gt 60 ]]; then
      log "Next.js did not become ready; last log lines:"
      tail -n 40 /tmp/next-dev.log 2>/dev/null || true
      return 1
    fi
    sleep 1
  done
  log "Next.js ready on :${CRM_LAB_APP_PORT}"
}

cdp_ready() {
  curl -sf "http://127.0.0.1:${CRM_LAB_CDP_PORT}/json/version" >/dev/null 2>&1
}

start_cdp_browser() {
  if cdp_ready; then
    log "CDP already reachable on :${CRM_LAB_CDP_PORT}"
    return 0
  fi
  if [[ ! -x "${CRM_LAB_CHROME_BIN}" && ! -x /usr/bin/google-chrome-stable ]]; then
    log "No Chrome-family browser found"
    return 1
  fi
  mkdir -p "${CRM_LAB_REA_PROFILE}"
  local chrome_bin="${CRM_LAB_CHROME_BIN}"
  if [[ ! -x "${chrome_bin}" ]]; then
    chrome_bin="/usr/bin/google-chrome-stable"
  fi
  local url="http://127.0.0.1:${CRM_LAB_APP_PORT}"
  log "Starting Chrome with loopback CDP on :${CRM_LAB_CDP_PORT}"
  tmux has-session -t cdp-browser 2>/dev/null ||
    tmux new-session -d -s cdp-browser \
      "export DISPLAY='${DISPLAY:-:1}' PATH='/usr/local/bin:${PATH}'; '${chrome_bin}' --no-sandbox --test-type --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --password-store=basic --no-first-run --no-default-browser-check --remote-debugging-address=127.0.0.1 --remote-debugging-port=${CRM_LAB_CDP_PORT} --user-data-dir='${CRM_LAB_REA_PROFILE}' --class=google-chrome '${url}' 2>&1 | tee /tmp/cdp-browser.log"
  local i=0
  until cdp_ready; do
    i=$((i + 1))
    if [[ "${i}" -gt 45 ]]; then
      log "CDP did not become ready; last log lines:"
      tail -n 40 /tmp/cdp-browser.log 2>/dev/null || true
      return 1
    fi
    sleep 1
  done
  log "CDP ready on :${CRM_LAB_CDP_PORT}"
}

ensure_postgres_running
ensure_local_database
sync_prisma_schema
start_next_dev
start_cdp_browser
log "Start complete"

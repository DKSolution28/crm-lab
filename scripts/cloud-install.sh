#!/usr/bin/env bash
# Idempotent Cloud Agent install for the Salesforce demo RE lab.
# Safe when this PR is not merged: toolchain steps still run; app steps are guarded.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/toolchain.sh
source "${ROOT}/scripts/lib/toolchain.sh"
prefer_usr_local_node

log() {
  printf '[cloud-install] %s\n' "$*"
}

ensure_profile_path() {
  local profile="/etc/profile.d/crm-lab-path.sh"
  local contents='export PATH="/usr/local/bin:$PATH"'
  if [[ -f "${profile}" ]] && grep -q '/usr/local/bin' "${profile}"; then
    return 0
  fi
  printf '%s\n' "${contents}" | sudo tee "${profile}" >/dev/null
}

ensure_node() {
  prefer_usr_local_node
  if [[ -x /usr/local/bin/node ]]; then
    local installed
    installed="$(/usr/local/bin/node --version | tr -d 'v')"
    if [[ "${installed}" == "${CRM_LAB_NODE_VERSION}" ]]; then
      log "Node.js ${installed} already present in /usr/local"
      return 0
    fi
  fi

  local tarball="node-v${CRM_LAB_NODE_VERSION}-linux-x64.tar.xz"
  local url="https://nodejs.org/dist/v${CRM_LAB_NODE_VERSION}/${tarball}"
  local tmp
  tmp="$(mktemp -d)"
  log "Installing Node.js ${CRM_LAB_NODE_VERSION} to /usr/local"
  curl -fsSL "${url}" -o "${tmp}/${tarball}"
  sudo tar -xJ -C /usr/local --strip-components=1 --no-same-owner -f "${tmp}/${tarball}"
  rm -rf "${tmp}"
  prefer_usr_local_node
  /usr/local/bin/node --version
  /usr/local/bin/npm --version
}

ensure_postgres_packages() {
  if command -v psql >/dev/null 2>&1 && command -v pg_isready >/dev/null 2>&1; then
    log "PostgreSQL client tools already installed"
    return 0
  fi
  log "Installing PostgreSQL"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    postgresql-client
}

ensure_dev_packages() {
  log "Ensuring common development packages"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    build-essential \
    python3 \
    xz-utils \
    unzip \
    wget
}

ensure_local_env_file() {
  if [[ ! -f "${ROOT}/.env.example" ]]; then
    return 0
  fi
  if [[ ! -f "${ROOT}/.env" ]]; then
    cp "${ROOT}/.env.example" "${ROOT}/.env"
    log "Wrote ${ROOT}/.env from .env.example (local defaults only)"
  fi
}

install_js_dependencies() {
  if [[ ! -f "${ROOT}/package.json" ]]; then
    log "No package.json yet; skipping npm install"
    return 0
  fi
  cd "${ROOT}"
  if [[ -f "${ROOT}/package-lock.json" ]]; then
    log "Running npm ci"
    npm ci
  else
    log "Running npm install"
    npm install
  fi
}

install_playwright_chromium() {
  cd "${ROOT}"
  if [[ -f "${ROOT}/package.json" ]] && npm ls playwright >/dev/null 2>&1; then
    log "Installing Playwright Chromium with system dependencies"
    npx playwright install --with-deps chromium
    return 0
  fi
  log "Installing Playwright Chromium via package runner"
  npx --yes playwright@latest install --with-deps chromium
}

generate_prisma_client() {
  if [[ ! -f "${ROOT}/prisma/schema.prisma" ]]; then
    log "No Prisma schema yet; skipping generate"
    return 0
  fi
  cd "${ROOT}"
  log "Generating Prisma client"
  npx prisma generate
}

ensure_profile_path
ensure_dev_packages
ensure_node
ensure_postgres_packages
ensure_local_env_file
install_js_dependencies
install_playwright_chromium
generate_prisma_client

log "Install complete"
node --version
npm --version
git --version
command -v psql >/dev/null && psql --version || true

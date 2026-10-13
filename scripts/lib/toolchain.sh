#!/usr/bin/env bash
# Shared PATH and version helpers for Cloud Agent scripts.
# Login shells may resolve /exec-daemon/node (too old for REA) before /usr/local/bin.

set -euo pipefail

export PATH="/usr/local/bin:${PATH}"

CRM_LAB_NODE_VERSION="${CRM_LAB_NODE_VERSION:-24.21.0}"
CRM_LAB_REA_VERSION="${CRM_LAB_REA_VERSION:-6.4.0}"
CRM_LAB_MIN_NODE_MAJOR=24
CRM_LAB_MIN_NODE_MINOR=11

CRM_LAB_DB_NAME="${CRM_LAB_DB_NAME:-crm_lab}"
CRM_LAB_DB_USER="${CRM_LAB_DB_USER:-crm_lab}"
CRM_LAB_DB_PASSWORD="${CRM_LAB_DB_PASSWORD:-crm_lab}"
if [[ -n "${DATABASE_URL:-}" ]]; then
  CRM_LAB_DATABASE_URL="${DATABASE_URL}"
else
  CRM_LAB_DATABASE_URL="postgresql://${CRM_LAB_DB_USER}:${CRM_LAB_DB_PASSWORD}@127.0.0.1:5432/${CRM_LAB_DB_NAME}"
fi

CRM_LAB_CDP_PORT="${CRM_LAB_CDP_PORT:-9222}"
CRM_LAB_APP_PORT="${CRM_LAB_APP_PORT:-3000}"
CRM_LAB_CHROME_BIN="${CRM_LAB_CHROME_BIN:-/usr/local/bin/google-chrome}"
CRM_LAB_REA_PROFILE="${CRM_LAB_REA_PROFILE:-/tmp/rea-browser-profile}"

node_semver() {
  command -v node >/dev/null 2>&1 || {
    echo "0.0.0"
    return 0
  }
  node --version | tr -d 'v'
}

node_meets_rea() {
  local raw major minor
  raw="$(node_semver)"
  major="${raw%%.*}"
  minor="${raw#*.}"
  minor="${minor%%.*}"
  if [[ "${major}" -gt "${CRM_LAB_MIN_NODE_MAJOR}" ]]; then
    return 0
  fi
  if [[ "${major}" -eq "${CRM_LAB_MIN_NODE_MAJOR}" && "${minor}" -ge "${CRM_LAB_MIN_NODE_MINOR}" ]]; then
    return 0
  fi
  # REA also accepts Node 22.19+ and 26+, but this lab pins 24.11+.
  return 1
}

prefer_usr_local_node() {
  export PATH="/usr/local/bin:${PATH}"
  hash -r 2>/dev/null || true
}

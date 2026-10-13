# shellcheck shell=bash
# Shell environment for crm-lab on a Cursor Cloud Agent VM.
#
#   source scripts/cloud/env.sh
#
# Why this exists: the Cloud Agent shell puts an internal Node 22.14 binary
# (/exec-daemon/node) ahead of everything else on PATH, and `install`/`start`
# run as non-interactive login shells that never read ~/.bashrc (so nvm is not
# loaded). REA 6.4.0 needs Node ^22.19 || ^24.11 || >=26, so every script and
# every agent shell must put the project Node first explicitly.
#
# Safe to source several times. Never prints secrets.

CRM_LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export CRM_LAB_ROOT

# --- Node.js -----------------------------------------------------------------
# scripts/cloud/install-node.sh maintains this symlink (-> the pinned version
# from .nvmrc). Fall back to the newest nvm-installed v24 if the link is absent.
CRM_LAB_NODE_HOME="/usr/local/lib/nodejs/current"
if [ ! -x "$CRM_LAB_NODE_HOME/bin/node" ]; then
  _crm_lab_nvm_candidate="$(find "$HOME/.nvm/versions/node" -maxdepth 1 -type d -name 'v24.*' 2>/dev/null | sort -V | tail -n 1 || true)"
  if [ -n "$_crm_lab_nvm_candidate" ] && [ -x "$_crm_lab_nvm_candidate/bin/node" ]; then
    CRM_LAB_NODE_HOME="$_crm_lab_nvm_candidate"
  fi
  unset _crm_lab_nvm_candidate
fi
export CRM_LAB_NODE_HOME
case ":$PATH:" in
  *":$CRM_LAB_NODE_HOME/bin:"*) ;;
  *) export PATH="$CRM_LAB_NODE_HOME/bin:$PATH" ;;
esac

# --- Browsers ----------------------------------------------------------------
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"

# REA's web tooling wants an absolute Chromium path (REA_BROWSER_EXECUTABLE).
# Prefer the Playwright-managed Chromium; fall back to the image's Chrome.
if [ -z "${REA_BROWSER_EXECUTABLE:-}" ]; then
  _crm_lab_chromium="$(find "$PLAYWRIGHT_BROWSERS_PATH" -maxdepth 3 -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1 || true)"
  if [ -z "$_crm_lab_chromium" ]; then
    _crm_lab_chromium="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
  fi
  if [ -n "$_crm_lab_chromium" ]; then
    export REA_BROWSER_EXECUTABLE="$_crm_lab_chromium"
  fi
  unset _crm_lab_chromium
fi
export CRM_LAB_CHROMIUM="${REA_BROWSER_EXECUTABLE:-}"

# --- Services ----------------------------------------------------------------
export CRM_LAB_DEV_PORT="${CRM_LAB_DEV_PORT:-3000}"
export CRM_LAB_BASE_URL="${CRM_LAB_BASE_URL:-http://localhost:$CRM_LAB_DEV_PORT}"
export CRM_LAB_CDP_PORT="${CRM_LAB_CDP_PORT:-9222}"
export CRM_LAB_CDP_URL="http://127.0.0.1:$CRM_LAB_CDP_PORT"

# tmux: the agent runtime ships its own tmux; use it when present so sessions
# created by start.sh are visible from agent shells (same server/socket).
crm_lab_tmux() {
  if [ -x /exec-daemon/tmux ]; then
    if [ -f /exec-daemon/tmux.portal.conf ]; then
      /exec-daemon/tmux -f /exec-daemon/tmux.portal.conf "$@"
    else
      /exec-daemon/tmux "$@"
    fi
  else
    tmux "$@"
  fi
}

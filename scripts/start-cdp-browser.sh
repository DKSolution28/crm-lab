#!/usr/bin/env bash
# Start a Chromium instance exposing the Chrome DevTools Protocol on loopback.
#
# Used by REA (`rea list-browser-targets`, `inspect-web-page`, ...) and by
# Playwright (`chromium.connectOverCDP(CRM_LAB_CDP_URL)`) to observe the
# target web application passively. Headless by default; set
# CRM_LAB_CDP_HEADLESS=0 to get a visible window when a DISPLAY exists.
#
# Idempotent: exits 0 immediately when the endpoint already answers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/scripts/cloud/env.sh"

PORT="$CRM_LAB_CDP_PORT"
PROFILE_DIR="${CRM_LAB_CDP_PROFILE_DIR:-/tmp/crm-lab-cdp-profile}"
LOG_FILE="${CRM_LAB_CDP_LOG:-/tmp/crm-lab-cdp-browser.log}"
PID_FILE="${CRM_LAB_CDP_PID_FILE:-/tmp/crm-lab-cdp-browser.pid}"
START_URL="${CRM_LAB_CDP_START_URL:-about:blank}"
HEADLESS="${CRM_LAB_CDP_HEADLESS:-1}"

log() { printf '[cdp-browser] %s\n' "$*"; }

endpoint_ready() { curl -fsS "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; }

if endpoint_ready; then
  log "CDP endpoint already listening on http://127.0.0.1:$PORT"
  exit 0
fi

CHROMIUM="${CRM_LAB_CHROMIUM:-}"
if [ -z "$CHROMIUM" ] || [ ! -x "$CHROMIUM" ]; then
  echo "No Chromium executable found. Run: npx playwright install --with-deps chromium" >&2
  exit 1
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  log "Stale browser process $(cat "$PID_FILE") without endpoint; stopping it"
  kill "$(cat "$PID_FILE")" || true
  sleep 1
fi
rm -f "$PID_FILE" "$PROFILE_DIR/SingletonLock" 2>/dev/null || true
mkdir -p "$PROFILE_DIR"

ARGS=(
  "--remote-debugging-port=$PORT"
  "--remote-debugging-address=127.0.0.1"
  "--user-data-dir=$PROFILE_DIR"
  --no-first-run
  --no-default-browser-check
  --disable-background-networking
  --disable-features=TranslateUI
  "--window-size=1280,800"
)
# Cloud Agent VMs run Chromium inside a container without user namespaces,
# so the setuid sandbox is unavailable; the lab only browses targets the
# operator chose, so disabling it is acceptable here.
ARGS+=(--no-sandbox --disable-dev-shm-usage)
if [ "$HEADLESS" != "0" ] || [ -z "${DISPLAY:-}" ]; then
  ARGS+=(--headless=new --disable-gpu)
fi

log "Launching $CHROMIUM on port $PORT (log: $LOG_FILE)"
nohup "$CHROMIUM" "${ARGS[@]}" "$START_URL" >"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

for _ in $(seq 1 30); do
  if endpoint_ready; then
    log "Ready: $(curl -fsS "http://127.0.0.1:$PORT/json/version" | jq -r '.Browser')"
    exit 0
  fi
  sleep 1
done

echo "CDP endpoint did not come up within 30s; see $LOG_FILE" >&2
exit 1

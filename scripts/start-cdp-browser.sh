#!/usr/bin/env bash
# Start (once) a headless Playwright Chromium exposing a loopback CDP endpoint
# for REA web commands, e.g. `npx rea list-browser-targets http://127.0.0.1:9222`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/node-env.sh

PORT="${CDP_PORT:-9222}"
ENDPOINT="http://127.0.0.1:$PORT"
PROFILE_DIR="${CDP_PROFILE_DIR:-/tmp/crm-lab-cdp-profile}"
LOG_FILE="${CDP_LOG_FILE:-/tmp/crm-lab-cdp-browser.log}"

if curl -fsS "$ENDPOINT/json/version" >/dev/null 2>&1; then
  echo "CDP browser already listening on $ENDPOINT"
  exit 0
fi

CHROMIUM="${REA_BROWSER_EXECUTABLE:-}"
if [ ! -x "$CHROMIUM" ]; then
  echo "Playwright Chromium not found; run scripts/cloud-install.sh" >&2
  exit 1
fi

rm -f "$PROFILE_DIR/SingletonLock" "$PROFILE_DIR/SingletonSocket" "$PROFILE_DIR/SingletonCookie"
mkdir -p "$PROFILE_DIR"

# setsid: keep the browser alive after the launching (start/tmux) session exits.
setsid nohup "$CHROMIUM" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --no-first-run \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE_DIR" \
  about:blank >"$LOG_FILE" 2>&1 &
echo "$!" > /tmp/crm-lab-cdp-browser.pid

for _ in $(seq 1 30); do
  if curl -fsS "$ENDPOINT/json/version" >/dev/null 2>&1; then
    echo "CDP browser ready on $ENDPOINT (pid $(cat /tmp/crm-lab-cdp-browser.pid))"
    exit 0
  fi
  sleep 1
done

echo "CDP browser did not become ready; see $LOG_FILE" >&2
exit 1

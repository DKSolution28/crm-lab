#!/usr/bin/env bash
# Boot entrypoint: a headless Chromium with DevTools on port 9222, then the lab.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

CDP_PORT="${CDP_PORT:-9222}"
CDP_PROFILE="${CDP_PROFILE:-/tmp/crm-lab-cdp}"

if ! curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
  browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"
  mkdir -p "${CDP_PROFILE}"
  "${browser}" \
    --headless=new \
    --remote-debugging-port="${CDP_PORT}" \
    --user-data-dir="${CDP_PROFILE}" \
    --no-first-run \
    --no-default-browser-check \
    about:blank \
    >/tmp/crm-lab-cdp.log 2>&1 &
  ready=0
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "${ready}" -ne 1 ]]; then
    echo "Chromium DevTools did not open on port ${CDP_PORT}." >&2
    cat /tmp/crm-lab-cdp.log >&2 || true
    exit 1
  fi
fi

echo "Chromium DevTools ready on port ${CDP_PORT}"
exec bash scripts/cloud-agent-start.sh

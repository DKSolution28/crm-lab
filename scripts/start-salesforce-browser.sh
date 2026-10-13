#!/usr/bin/env bash
# Dedicated Chromium for the authorized Salesforce Developer Org.
# Separate from the lab browser (port 9222): own port, own profile, loopback only.
# The script never types credentials; sign-in (including SSO/MFA) is done by a human.
#   SF_HEADED=1 opens a visible window on $DISPLAY (VNC desktop) for interactive login.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

SF_CDP_PORT="${SF_CDP_PORT:-9223}"
SF_PROFILE="${SF_PROFILE:-/tmp/sf-devorg-cdp}"
LAB_PORT=9222

if [[ "${SF_CDP_PORT}" == "${LAB_PORT}" || "${SF_PROFILE}" == "/tmp/crm-lab-cdp" ]]; then
  echo "Refusing to share the lab browser port or profile." >&2
  exit 1
fi

if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "Salesforce browser already listening on ${SF_CDP_PORT}"
  exit 0
fi

browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"
mode=(--headless=new)
if [[ "${SF_HEADED:-0}" == "1" ]]; then
  mode=()
fi

mkdir -p "${SF_PROFILE}"
chmod 700 "${SF_PROFILE}"
nohup "${browser}" \
  "${mode[@]}" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${SF_CDP_PORT}" \
  --user-data-dir="${SF_PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  about:blank \
  >/tmp/sf-devorg-cdp.log 2>&1 &

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "Salesforce browser ready: http://127.0.0.1:${SF_CDP_PORT} (profile ${SF_PROFILE})"
    exit 0
  fi
  sleep 1
done
echo "Salesforce browser did not open port ${SF_CDP_PORT}" >&2
cat /tmp/sf-devorg-cdp.log >&2 || true
exit 1

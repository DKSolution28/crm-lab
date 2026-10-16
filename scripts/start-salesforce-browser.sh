#!/usr/bin/env bash
# Open a dedicated Chromium session for an authorized Salesforce Developer Org.
#
# The session is isolated from the lab browser started by start-cdp-browser.sh:
# its own user-data-dir, its own DevTools port, and a visible window on the VM
# desktop so a person can complete the Salesforce login (SSO/MFA) by taking
# control of the remote desktop. No credential is read or stored here.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

SF_CDP_PORT="${SF_CDP_PORT:-9223}"
SF_CDP_PROFILE="${SF_CDP_PROFILE:-/tmp/crm-lab-salesforce}"
SF_LOGIN_URL="${SF_LOGIN_URL:-https://login.salesforce.com/}"
SF_BROWSER_LOG="${SF_BROWSER_LOG:-/tmp/crm-lab-salesforce.log}"
export DISPLAY="${DISPLAY:-:1}"

if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "Salesforce browser DevTools already listening on port ${SF_CDP_PORT}"
  exit 0
fi

browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"
mkdir -p "${SF_CDP_PROFILE}"
chmod 700 "${SF_CDP_PROFILE}"

headless_flag=()
if [[ "${SF_HEADLESS:-0}" == "1" ]]; then
  headless_flag=(--headless=new)
fi

"${browser}" \
  "${headless_flag[@]}" \
  --remote-debugging-port="${SF_CDP_PORT}" \
  --user-data-dir="${SF_CDP_PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  --password-store=basic \
  --window-size=1440,900 \
  --window-position=40,40 \
  "${SF_LOGIN_URL}" \
  >"${SF_BROWSER_LOG}" 2>&1 &

ready=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "Salesforce browser DevTools did not open on port ${SF_CDP_PORT}." >&2
  cat "${SF_BROWSER_LOG}" >&2 || true
  exit 1
fi

echo "Salesforce browser ready: DevTools on http://127.0.0.1:${SF_CDP_PORT}, profile ${SF_CDP_PROFILE}, display ${DISPLAY}"
echo "Complete the Salesforce login in the visible window (take control of the remote desktop). Then run:"
echo "  npx rea-agents@6.4.0 list-browser-targets http://127.0.0.1:${SF_CDP_PORT}"

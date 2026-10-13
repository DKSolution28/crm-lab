#!/usr/bin/env bash
# Headed Chromium for the authorized Salesforce Developer Org, isolated from the lab browser:
# its own profile, its own loopback CDP port, shown on the VM desktop so a person can sign in
# (SSO/MFA included). The script never types credentials; it only opens the login page.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

SF_CDP_PORT="${SF_CDP_PORT:-9223}"
SF_PROFILE="${SF_PROFILE:-${HOME}/.crm-lab/salesforce-profile}"
SF_LOGIN_URL="${SALESFORCE_LOGIN_URL:-https://login.salesforce.com}"
export DISPLAY="${DISPLAY:-:1}"

if [[ "${SF_CDP_PORT}" == "${CDP_PORT:-9222}" ]]; then
  echo "SF_CDP_PORT must differ from the lab CDP port." >&2
  exit 1
fi

if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "Salesforce browser already listening on 127.0.0.1:${SF_CDP_PORT}"
  exit 0
fi

browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"
mkdir -p "${SF_PROFILE}"
chmod 700 "${SF_PROFILE}"

"${browser}" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${SF_CDP_PORT}" \
  --user-data-dir="${SF_PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  --window-size=1600,1000 \
  "${SF_LOGIN_URL}" \
  >/tmp/crm-lab-salesforce-browser.log 2>&1 &

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "Salesforce browser ready: CDP 127.0.0.1:${SF_CDP_PORT}, profile ${SF_PROFILE}, display ${DISPLAY}"
    echo "Sign in on the VM desktop, then run: npx rea-agents@6.4.0 list-browser-targets http://127.0.0.1:${SF_CDP_PORT}"
    exit 0
  fi
  sleep 1
done

echo "Salesforce browser did not open CDP on port ${SF_CDP_PORT}." >&2
cat /tmp/crm-lab-salesforce-browser.log >&2 || true
exit 1

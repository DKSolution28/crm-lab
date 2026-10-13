#!/usr/bin/env bash
# Distinct headless Chromium for an authorized Salesforce Developer Org.
# Does not start the CRM Lab server and does not share the lab CDP profile.
# Authentication stays human: this script never submits credentials, SSO, or MFA.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

CDP_PORT="${SALESFORCE_CDP_PORT:-9223}"
CDP_PROFILE="${SALESFORCE_CDP_PROFILE:-/tmp/crm-lab-salesforce-cdp}"
START_URL="${SALESFORCE_LOGIN_URL:-https://login.salesforce.com/}"
LOG_FILE="${SALESFORCE_CDP_LOG:-/tmp/crm-lab-salesforce-cdp.log}"

if [[ "${CDP_PORT}" == "9222" ]]; then
  echo "Refuse to bind the Salesforce session on port 9222 (reserved for the lab browser)." >&2
  exit 1
fi

browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"

if ! curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
  mkdir -p "${CDP_PROFILE}"
  "${browser}" \
    --headless=new \
    --remote-debugging-port="${CDP_PORT}" \
    --user-data-dir="${CDP_PROFILE}" \
    --no-first-run \
    --no-default-browser-check \
    about:blank \
    >"${LOG_FILE}" 2>&1 &
  ready=0
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "${ready}" -ne 1 ]]; then
    echo "Salesforce Chromium DevTools did not open on port ${CDP_PORT}." >&2
    cat "${LOG_FILE}" >&2 || true
    exit 1
  fi
fi

echo "Salesforce Chromium DevTools ready on port ${CDP_PORT}"
echo "Profile: ${CDP_PROFILE}"
echo "Opening ${START_URL} without submitting credentials."

encoded_url="$(
  START_URL="${START_URL}" python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["START_URL"], safe=":/?&=%#"))'
)"

curl -fsS -X PUT "http://127.0.0.1:${CDP_PORT}/json/new?${encoded_url}" >/dev/null
curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version"
echo
echo "Complete SSO or MFA yourself (remote desktop). Do not ask the agent to bypass login."

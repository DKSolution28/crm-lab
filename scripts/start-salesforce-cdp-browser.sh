#!/usr/bin/env bash
# Start an isolated, persistent browser profile for an authorized Salesforce org.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

CDP_PORT="${SALESFORCE_CDP_PORT:-9223}"
CDP_PROFILE="${SALESFORCE_CDP_PROFILE:-${HOME}/.cache/crm-lab/salesforce-cdp-profile}"
LOGIN_URL="${SALESFORCE_LOGIN_URL:-https://login.salesforce.com/}"
HEADLESS="${SALESFORCE_HEADLESS:-0}"

if [[ ! "${CDP_PORT}" =~ ^[0-9]+$ ]] || ((CDP_PORT < 1024 || CDP_PORT > 65535)); then
  echo "SALESFORCE_CDP_PORT must be an integer from 1024 to 65535." >&2
  exit 2
fi

if [[ "${CDP_PORT}" == "9222" ]]; then
  echo "Port 9222 is reserved for the CRM Lab test browser; use a distinct port." >&2
  exit 2
fi

if [[ ! "${LOGIN_URL}" =~ ^https:// ]]; then
  echo "SALESFORCE_LOGIN_URL must be an HTTPS URL for the authorized org." >&2
  exit 2
fi

if curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "A CDP browser is already available at http://127.0.0.1:${CDP_PORT}."
  echo "Profile expected by this launcher: ${CDP_PROFILE}"
  exit 0
fi

browser="$(node -e 'import("playwright").then((m) => console.log(m.chromium.executablePath()))')"
mkdir -p "${CDP_PROFILE}"
chmod 700 "${CDP_PROFILE}"

browser_args=(
  "--remote-debugging-address=127.0.0.1"
  "--remote-debugging-port=${CDP_PORT}"
  "--user-data-dir=${CDP_PROFILE}"
  "--no-first-run"
  "--no-default-browser-check"
)

if [[ "${HEADLESS}" == "1" ]]; then
  browser_args+=("--headless=new")
elif [[ "${HEADLESS}" != "0" ]]; then
  echo "SALESFORCE_HEADLESS must be 0 or 1." >&2
  exit 2
fi

"${browser}" "${browser_args[@]}" "${LOGIN_URL}" \
  >"/tmp/crm-lab-salesforce-cdp-${CDP_PORT}.log" 2>&1 &
browser_pid=$!

cleanup() {
  if kill -0 "${browser_pid}" 2>/dev/null; then
    kill "${browser_pid}"
  fi
}
trap cleanup INT TERM

ready=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "${browser_pid}" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "The Salesforce CDP browser did not become ready." >&2
  cat "/tmp/crm-lab-salesforce-cdp-${CDP_PORT}.log" >&2 || true
  wait "${browser_pid}" || true
  exit 1
fi

echo "Salesforce browser ready at http://127.0.0.1:${CDP_PORT}."
echo "Complete SSO and MFA manually in this browser; credentials are never read by this script."
wait "${browser_pid}"

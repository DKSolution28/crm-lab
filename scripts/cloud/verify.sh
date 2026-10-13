#!/usr/bin/env bash
# Verify the crm-lab Cloud Agent environment. Nothing here is simulated: every
# row of the report is the exit status of a real command, and the raw output of
# each check is kept next to the report.
#
#   bash scripts/cloud/verify.sh            # report in /tmp/crm-lab-verify
#   CRM_LAB_VERIFY_DIR=/opt/cursor/artifacts/verify bash scripts/cloud/verify.sh
#
# Exit status: 0 when every required check passes, 1 otherwise.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1
# shellcheck disable=SC1091
source scripts/cloud/env.sh

OUT="${CRM_LAB_VERIFY_DIR:-/tmp/crm-lab-verify}"
mkdir -p "$OUT"
REPORT="$OUT/report.md"
: > "$REPORT"

PASS=0
FAIL=0
ROWS=()

# run_check <id> <label> <command...>
# Runs the command, stores stdout+stderr in $OUT/<id>.log, records PASS/FAIL.
run_check() {
  local id="$1" label="$2"; shift 2
  local logf="$OUT/$id.log" status
  printf '%s\n\n' "\$ $*" > "$logf"
  "$@" >> "$logf" 2>&1
  status=$?
  local detail
  detail="$(grep -v '^\s*$' "$logf" | sed -n '2p' | cut -c1-110 | sed 's/|/\\|/g')"
  if [ "$status" -eq 0 ]; then
    PASS=$((PASS + 1)); ROWS+=("| PASS | $label | \`$*\` | $detail |")
    printf '  [PASS] %s\n' "$label"
  else
    FAIL=$((FAIL + 1)); ROWS+=("| FAIL (exit $status) | $label | \`$*\` | $detail |")
    printf '  [FAIL] %s (exit %s) -> %s\n' "$label" "$status" "$logf"
  fi
  return $status
}

semver_ge() { # semver_ge <actual> <minimum>
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" = "$2" ]
}

node_version_ok() {
  local v; v="$(node --version)"; v="${v#v}"
  echo "node $v"
  case "$v" in
    22.*) semver_ge "$v" 22.19.0 ;;
    24.*) semver_ge "$v" 24.11.0 ;;
    *) semver_ge "$v" 26.0.0 ;;
  esac
}

rea_version_is_640() {
  local v; v="$(npx rea-agents@6.4.0 --version 2>/dev/null | tail -n 1)"
  echo "rea-agents $v"
  [ "$v" = "6.4.0" ]
}

rea_doctor_json() {
  # `doctor` exits 1 whenever any optional engine (Hopper/Ghidra/IDA) or agent
  # registration is missing, which is expected on this VM. The check asserts
  # what the environment is responsible for: valid JSON, Node and host healthy.
  local json exit_code
  json="$(npx rea-agents@6.4.0 doctor --json 2>/dev/null)"; exit_code=$?
  printf '%s\n' "$json" > "$OUT/rea-doctor.json"
  printf '%s' "$json" | jq -r '"doctor exit='"$exit_code"' healthy=\(.healthy) node=\((.checks[]|select(.name=="node")).detail) host=\((.checks[]|select(.name=="host")).detail) cli=\(.identity.cli_package_version)"' || return 1
  echo "(exit 1 from doctor means optional native engines / agent MCP registration are missing)"
  printf '%s' "$json" | jq -e '
    (.checks[] | select(.name=="node") | .ok) and
    (.checks[] | select(.name=="host") | .ok)' >/dev/null
}

chromium_headless_ok() {
  if [ -z "${CRM_LAB_CHROMIUM:-}" ] || [ ! -x "$CRM_LAB_CHROMIUM" ]; then
    echo "no chromium executable found"
    return 1
  fi
  "$CRM_LAB_CHROMIUM" --version
  local dom
  dom="$("$CRM_LAB_CHROMIUM" --headless=new --no-sandbox --disable-gpu --dump-dom \
    'data:text/html,<title>crm-lab</title><p id="x">chromium-ok</p>' 2>/dev/null)"
  printf '%s\n' "$dom" | grep -q 'chromium-ok'
}

cdp_endpoint_ok() {
  curl -fsS "$CRM_LAB_CDP_URL/json/version" | jq -r '.Browser, .webSocketDebuggerUrl'
}

dev_app_ok() {
  if ! curl -fsS "$CRM_LAB_BASE_URL/api/health" >/dev/null 2>&1; then
    echo "dev server not answering; starting it via scripts/cloud/start.sh"
    bash scripts/cloud/start.sh >"$OUT/start.log" 2>&1 || { tail -n 20 "$OUT/start.log"; return 1; }
  fi
  local body
  body="$(curl -fsS "$CRM_LAB_BASE_URL/api/health")" || return 1
  echo "$body"
  printf '%s' "$body" | jq -e '.ok == true and .database.ok == true' >/dev/null &&
  curl -fsS "$CRM_LAB_BASE_URL/" | grep -q 'CRM Lab'
}

echo "crm-lab environment verification -> $OUT"
echo

echo "1. Versions"
run_check node "Node.js >= 24.11 (or 22.19+/26+)" node_version_ok
run_check npm "npm" npm --version
run_check git "git" git --version
run_check psql "PostgreSQL client" psql --version
run_check rea_version "rea-agents == 6.4.0" rea_version_is_640
run_check playwright_version "Playwright" npx playwright --version

echo "2. Chromium"
run_check chromium "Chromium headless renders a page" chromium_headless_ok

echo "3. REA CLI"
run_check rea_capabilities "npx rea-agents@6.4.0 capabilities" npx rea-agents@6.4.0 capabilities
run_check rea_doctor "npx rea-agents@6.4.0 doctor --json (node+host healthy)" rea_doctor_json

echo "4. Playwright"
run_check playwright_launch "Playwright launches Chromium" node scripts/cloud/playwright-check.mjs

echo "5. Services and dev application"
run_check postgres "PostgreSQL accepting connections" pg_isready
run_check dev_app "Next.js dev app + /api/health (DB ok)" dev_app_ok
run_check cdp "CDP browser endpoint" cdp_endpoint_ok

{
  echo "# crm-lab environment verification"
  echo
  echo "- Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Host: $(hostname) · $(. /etc/os-release && echo "$PRETTY_NAME") · $(uname -m)"
  echo "- Node used: $(command -v node) ($(node --version))"
  echo "- Chromium: ${CRM_LAB_CHROMIUM:-none}"
  echo "- Result: $PASS passed, $FAIL failed"
  echo
  echo "| Status | Check | Command | First output line |"
  echo "| --- | --- | --- | --- |"
  printf '%s\n' "${ROWS[@]}"
  echo
  echo "Raw logs: \`$OUT/*.log\`, REA doctor JSON: \`$OUT/rea-doctor.json\`."
} >> "$REPORT"

echo
echo "Report: $REPORT ($PASS passed, $FAIL failed)"
[ "$FAIL" -eq 0 ]

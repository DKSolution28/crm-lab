#!/usr/bin/env bash
# Verify the Cloud Agent environment and record raw evidence.
#   1. installed versions          4. Playwright can drive Chromium
#   2. Chromium runs headless      5. the Next.js dev app serves pages + DB health
#   3. the REA CLI runs (capabilities, doctor --json)
# Every result comes from a command executed by this script; raw outputs are
# written to $VERIFY_OUT (default .verify/<timestamp>). Exit code is non-zero
# when any required check fails. `rea doctor` reporting optional analysis
# engines (Ghidra/IDA/Hopper) as missing is recorded as WARN, not FAIL.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/node-env.sh

REA_VERSION="6.4.0"
OUT="${VERIFY_OUT:-$ROOT/.verify/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT"
SUMMARY="$OUT/summary.md"
RESULTS=()
FAILED=0

record() { # status name detail
  RESULTS+=("| $2 | $1 | $3 |")
  printf '[%s] %s: %s\n' "$1" "$2" "$3"
  [ "$1" = "FAIL" ] && FAILED=1
  return 0
}

# Node.js engines accepted by rea-agents@6.4.0: ^22.19.0 || ^24.11.0 || >=26.0.0
node_supported() {
  node -e '
    const [maj, min] = process.versions.node.split(".").map(Number);
    const ok = (maj === 22 && min >= 19) || (maj === 24 && min >= 11) || maj >= 26;
    process.exit(ok ? 0 : 1);'
}

echo "Writing evidence to $OUT"

# ---------------------------------------------------------------- 1. versions
{
  echo "node:        $(command -v node) $(node --version 2>&1)"
  echo "npm:         $(npm --version 2>&1)"
  echo "npx:         $(npx --version 2>&1)"
  echo "git:         $(git --version 2>&1)"
  echo "psql:        $(psql --version 2>&1)"
  echo "tmux:        $(tmux -V 2>&1)"
  echo "curl:        $(curl --version 2>&1 | head -1)"
  echo "jq:          $(jq --version 2>&1)"
  echo "gcc:         $(gcc --version 2>&1 | head -1)"
  echo "rea-agents:  $(npx --no-install rea --version 2>&1)"
  echo "playwright:  $(npx --no-install playwright --version 2>&1)"
  echo "next:        $(node -p 'require("next/package.json").version' 2>&1)"
  echo "typescript:  $(npx --no-install tsc --version 2>&1)"
  echo "tailwindcss: $(node -p 'require("tailwindcss/package.json").version' 2>&1)"
  echo "prisma:      $(node -p 'require("prisma/package.json").version' 2>&1)"
  echo "chromium:    ${REA_BROWSER_EXECUTABLE:-<missing>} $("${REA_BROWSER_EXECUTABLE:-false}" --version 2>&1)"
} > "$OUT/1-versions.txt" 2>&1
cat "$OUT/1-versions.txt"

if node_supported; then
  record PASS "Node.js" "$(node --version) satisfies rea-agents engines"
else
  record FAIL "Node.js" "$(node --version) does not satisfy ^22.19 || ^24.11 || >=26"
fi
rea_installed="$(npx --no-install rea --version 2>/dev/null)"
if [ "$rea_installed" = "$REA_VERSION" ]; then
  record PASS "REA version" "rea-agents $rea_installed"
else
  record FAIL "REA version" "expected $REA_VERSION, got '${rea_installed:-none}'"
fi

# ---------------------------------------------------------------- 2. Chromium
if [ -x "${REA_BROWSER_EXECUTABLE:-}" ]; then
  "$REA_BROWSER_EXECUTABLE" --headless=new --no-sandbox --disable-gpu \
    --dump-dom 'data:text/html,<p id="probe">chromium-ok</p>' > "$OUT/2-chromium-dump-dom.html" 2> "$OUT/2-chromium-stderr.log"
  if grep -q 'chromium-ok' "$OUT/2-chromium-dump-dom.html"; then
    record PASS "Chromium headless" "$("$REA_BROWSER_EXECUTABLE" --version) rendered a page (--dump-dom)"
  else
    record FAIL "Chromium headless" "--dump-dom output missing probe; see 2-chromium-stderr.log"
  fi
else
  record FAIL "Chromium headless" "Playwright Chromium executable not found"
fi

# ---------------------------------------------------------------- 3. REA CLI
npx --no-install rea capabilities > "$OUT/3-rea-capabilities.txt" 2>&1
cap_rc=$?
if [ $cap_rc -eq 0 ]; then
  available=$(grep -c '^    available: true' "$OUT/3-rea-capabilities.txt" || true)
  total=$(grep -c '^  - operation:' "$OUT/3-rea-capabilities.txt" || true)
  record PASS "rea capabilities" "exit 0, $available/$total operations available on this host"
else
  record FAIL "rea capabilities" "exit $cap_rc; see 3-rea-capabilities.txt"
fi

npx --no-install rea doctor --json > "$OUT/3-rea-doctor.json" 2> "$OUT/3-rea-doctor.stderr"
doc_rc=$?
if jq -e . "$OUT/3-rea-doctor.json" >/dev/null 2>&1; then
  healthy=$(jq -r '.healthy' "$OUT/3-rea-doctor.json")
  node_ok=$(jq -r '[.checks[] | select(.name=="node")][0].ok' "$OUT/3-rea-doctor.json")
  failing=$(jq -r '[.checks[] | select(.ok==false) | .name] | join(", ")' "$OUT/3-rea-doctor.json")
  if [ "$node_ok" != "true" ]; then
    record FAIL "rea doctor --json" "exit $doc_rc, node check failed"
  elif [ "$healthy" = "true" ]; then
    record PASS "rea doctor --json" "exit $doc_rc, healthy=true"
  else
    record WARN "rea doctor --json" "exit $doc_rc, valid JSON, node+host ok, healthy=false (not ok: $failing)"
  fi
else
  record FAIL "rea doctor --json" "exit $doc_rc, output is not valid JSON"
fi

# ---------------------------------------------------------------- 4. Playwright
if node scripts/check-playwright.mjs > "$OUT/4-playwright.json" 2>&1; then
  record PASS "Playwright launch" "chromium $(jq -r .browserVersion "$OUT/4-playwright.json") launched and rendered content"
else
  record FAIL "Playwright launch" "see 4-playwright.json"
fi

# ---------------------------------------------------------------- 5. dev app
DEV_PID=""
APP_URL="http://localhost:3000"
if curl -fsS -o /dev/null "$APP_URL/api/health" 2>/dev/null; then
  echo "Using running dev server at $APP_URL"
else
  APP_URL="http://localhost:${VERIFY_DEV_PORT:-3100}"
  if ! pg_isready -q -h localhost; then sudo service postgresql start >/dev/null; fi
  bash scripts/db-setup.sh --seed > "$OUT/5-db-setup.log" 2>&1 || true
  echo "Starting temporary dev server at $APP_URL"
  setsid npx --no-install next dev --port "${APP_URL##*:}" > "$OUT/5-next-dev.log" 2>&1 &
  DEV_PID=$!
  for _ in $(seq 1 120); do
    curl -fsS -o /dev/null "$APP_URL/api/health" 2>/dev/null && break
    sleep 1
  done
fi

home_status=$(curl -s -o "$OUT/5-home.html" -w '%{http_code}' "$APP_URL/")
health_status=$(curl -s -o "$OUT/5-health.json" -w '%{http_code}' "$APP_URL/api/health")
if [ "$home_status" = "200" ] && grep -q 'CRM Lab' "$OUT/5-home.html"; then
  record PASS "Dev server page" "GET $APP_URL/ -> 200"
else
  record FAIL "Dev server page" "GET $APP_URL/ -> $home_status"
fi
if [ "$health_status" = "200" ] && [ "$(jq -r .database "$OUT/5-health.json" 2>/dev/null)" = "up" ]; then
  record PASS "Dev server DB health" "GET /api/health -> 200 $(jq -c .counts "$OUT/5-health.json")"
else
  record FAIL "Dev server DB health" "GET /api/health -> $health_status $(head -c 200 "$OUT/5-health.json")"
fi

if node scripts/check-playwright.mjs "$APP_URL/" "$OUT/5-home.png" > "$OUT/5-playwright-app.json" 2>&1; then
  record PASS "Playwright -> app" "loaded $APP_URL/ (h1: $(jq -r .h1 "$OUT/5-playwright-app.json")), screenshot 5-home.png"
else
  record FAIL "Playwright -> app" "see 5-playwright-app.json"
fi

if E2E_BASE_URL="$APP_URL" npx --no-install playwright test --reporter=line > "$OUT/5-playwright-test.log" 2>&1; then
  record PASS "Playwright e2e tests" "$(grep -Eo '[0-9]+ passed' "$OUT/5-playwright-test.log" | tail -1)"
else
  record FAIL "Playwright e2e tests" "see 5-playwright-test.log"
fi

# REA connects to a loopback CDP browser; open the app there and list targets.
CDP="http://127.0.0.1:${CDP_PORT:-9222}"
if bash scripts/start-cdp-browser.sh > "$OUT/5-cdp-browser.log" 2>&1; then
  curl -fsS -X PUT "$CDP/json/new?$APP_URL/" > "$OUT/5-cdp-new-target.json" 2>&1
  sleep 3
  npx --no-install rea list-browser-targets "$CDP" --format json > "$OUT/5-rea-list-browser-targets.json" 2>&1
  if grep -q "${APP_URL#http://}" "$OUT/5-rea-list-browser-targets.json"; then
    record PASS "REA via CDP" "rea list-browser-targets sees $APP_URL/ on $CDP"
  else
    record FAIL "REA via CDP" "target not listed; see 5-rea-list-browser-targets.json"
  fi
  target_id=$(jq -r '.id // empty' "$OUT/5-cdp-new-target.json" 2>/dev/null)
  [ -n "$target_id" ] && curl -fsS "$CDP/json/close/$target_id" >/dev/null 2>&1
else
  record FAIL "REA via CDP" "CDP browser failed to start; see 5-cdp-browser.log"
fi

if [ -n "$DEV_PID" ]; then
  kill -- "-$DEV_PID" 2>/dev/null || kill "$DEV_PID" 2>/dev/null
  wait "$DEV_PID" 2>/dev/null
fi

# ---------------------------------------------------------------- summary
{
  echo "# Environment verification ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
  echo
  echo "| Check | Status | Detail |"
  echo "| --- | --- | --- |"
  printf '%s\n' "${RESULTS[@]}"
  echo
  echo '```'
  cat "$OUT/1-versions.txt"
  echo '```'
} > "$SUMMARY"

echo
cat "$SUMMARY"
exit $FAILED

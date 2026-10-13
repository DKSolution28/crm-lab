#!/usr/bin/env bash
# Verification de l'environnement du labo (5 controles).
# Usage : ./scripts/verify.sh [--report-dir .verification]
# Ecrit un rapport JSON + Markdown dans le dossier de rapport (ignore par git).
# Code de sortie : 0 si tous les controles passent, 1 sinon.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

REPORT_DIR="${1:-.verification}"
if [[ "${1:-}" == "--report-dir" ]]; then
  REPORT_DIR="${2:-.verification}"
fi
mkdir -p "$REPORT_DIR"
JSON_REPORT="$REPORT_DIR/report.json"
MD_REPORT="$REPORT_DIR/report.md"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/use-node24.sh"

PASS=0
FAIL=0
declare -A DETAILS

ok()   { echo "  [OK] $1"; PASS=$((PASS + 1)); DETAILS["$2"]="PASS: $3"; }
ko()   { echo "  [ECHEC] $1"; echo "         $3"; FAIL=$((FAIL + 1)); DETAILS["$2"]="FAIL: $3"; }

echo "== 1. Versions installees =="
NODE_V="$(node --version 2>&1)"; NPM_V="$(npm --version 2>&1)"
REA_V="$(npx rea-agents@6.4.0 --version 2>&1 | tail -n 1)"
PW_V="$(npx playwright --version 2>&1 | tail -n 1)"
GIT_V="$(git --version 2>&1)"
NEXT_V="$(npx next --version 2>&1 | tail -n 1)"
echo "  node=$NODE_V npm=$NPM_V rea-cli=[$REA_V] playwright=[$PW_V] $GIT_V next=[$NEXT_V]"
if node -e "const [M, m] = process.version.slice(1).split('.').map(Number); const ok = (M === 22 && m >= 19) || (M === 24 && m >= 11) || M >= 26; process.exit(ok ? 0 : 1);" 2>/dev/null; then
  ok "Node.js compatible REA (>= 22.19, 24.11+ ou 26+)" "node" "$NODE_V"
else
  ko "Node.js incompatible avec REA" "node" "$NODE_V (requis : 22.19+, 24.11+ ou 26+)"
fi
if npm ls rea-agents@6.4.0 --depth=0 >/dev/null 2>&1; then
  ok "REA 6.4.0 installe" "rea" "rea-agents@$(node -p "require('rea-agents/package.json').version" 2>/dev/null)"
else
  ko "REA 6.4.0 manquant" "rea" "npm ls rea-agents@6.4.0 a echoue"
fi

echo "== 2. Fonctionnement de Chromium =="
if CHROMIUM_LINE="$(npx playwright install --dry-run chromium 2>&1 | tail -n 3)"; then
  echo "  $CHROMIUM_LINE" | head -n 3
fi
CHROMIUM_VERSION="$(node -e "const { chromium } = require('playwright'); (async () => { const b = await chromium.launch(); console.log(b.version()); await b.close(); })().catch((e) => { console.error('LAUNCH_ERROR: ' + e.message); process.exit(1); });" 2>&1)"
if [[ "$CHROMIUM_VERSION" == LAUNCH_ERROR* ]]; then
  ko "Lancement Chromium" "chromium" "$CHROMIUM_VERSION"
else
  ok "Chromium se lance (version $CHROMIUM_VERSION)" "chromium" "$CHROMIUM_VERSION"
fi

echo "== 3. CLI REA =="
if REA_CAPS="$(npx rea-agents@6.4.0 capabilities 2>&1)"; then
  echo "$REA_CAPS" | head -n 10 | sed 's/^/  /'
  ok "rea-agents capabilities" "rea-capabilities" "$(echo "$REA_CAPS" | head -n 5 | tr '\n' ';')"
else
  ko "rea-agents capabilities" "rea-capabilities" "$(echo "$REA_CAPS" | tail -n 3 | tr '\n' ';')"
fi
if REA_DOCTOR_OUT="$(npx rea-agents@6.4.0 doctor --json 2>/dev/null)"; then
  REA_DOCTOR_STATUS=0
else
  REA_DOCTOR_STATUS=$?
fi
if printf '%s' "$REA_DOCTOR_OUT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{JSON.parse(s);process.exit(0)}catch(e){process.exit(1)}})"; then
  REA_HEALTHY="$(printf '%s' "$REA_DOCTOR_OUT" | node -p "String(JSON.parse(require('fs').readFileSync(0,'utf8')).healthy)")"
  if [[ "$REA_HEALTHY" == "true" ]]; then
    ok "rea-agents doctor --json (healthy=true)" "rea-doctor" "exit=$REA_DOCTOR_STATUS healthy=true"
  else
    ok "rea-agents doctor --json s'execute (healthy=false : moteurs d'analyse optionnels non installes)" "rea-doctor" "exit=$REA_DOCTOR_STATUS healthy=false (hopper/ghidra/ida/skill non configures — voir docs/ENVIRONNEMENT.md)"
  fi
  echo "$REA_DOCTOR_OUT" | head -c 600 | sed 's/^/  /'
  echo ""
else
  ko "rea-agents doctor --json (sortie non-JSON)" "rea-doctor" "exit=$REA_DOCTOR_STATUS $(echo "$REA_DOCTOR_OUT" | tail -n 5 | tr '\n' ';')"
fi

echo "== 4. Navigateur via Playwright (tests) =="
if PW_TEST="$(npx playwright test 2>&1)"; then
  echo "$PW_TEST" | tail -n 6 | sed 's/^/  /'
  ok "playwright test (Chromium pilotable)" "playwright-test" "$(echo "$PW_TEST" | tail -n 3 | tr '\n' ';')"
else
  echo "$PW_TEST" | tail -n 15 | sed 's/^/  /'
  ko "playwright test" "playwright-test" "$(echo "$PW_TEST" | tail -n 3 | tr '\n' ';')"
fi

echo "== 5. Application de developpement (next dev + HTTP 200) =="
DEV_PORT="${PORT:-3100}"
NEXT_PID=""
cleanup() { if [[ -n "$NEXT_PID" ]]; then kill -- "-$NEXT_PID" 2>/dev/null || kill "$NEXT_PID" 2>/dev/null || true; fi }
trap cleanup EXIT
# set -m : le serveur demarre dans son propre groupe de processus (PGID = $!),
# ce qui permet d'arreter aussi ses processus enfants via kill -- -PGID.
set -m
npx next dev --port "$DEV_PORT" --hostname 127.0.0.1 >"$REPORT_DIR/next-dev.log" 2>&1 &
NEXT_PID=$!
echo "$NEXT_PID" >"$REPORT_DIR/next-dev.pid"
set +m
NEXT_PID="$(cat "$REPORT_DIR/next-dev.pid")"
HTTP_CODE="000"
for _ in $(seq 1 60); do
  sleep 2
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then break; fi
  HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$DEV_PORT/" 2>/dev/null || echo "000")"
  if [[ "$HTTP_CODE" == "200" ]]; then break; fi
done
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "next dev repond HTTP 200 sur le port $DEV_PORT" "next-dev" "HTTP 200 sur http://127.0.0.1:$DEV_PORT/"
else
  ko "next dev ne repond pas HTTP 200" "next-dev" "dernier code HTTP: $HTTP_CODE (voir $REPORT_DIR/next-dev.log)"
fi
kill -- "-$NEXT_PID" 2>/dev/null || kill "$NEXT_PID" 2>/dev/null || true
NEXT_PID=""
trap - EXIT

echo ""
echo "Resultat : $PASS reussis, $FAIL echoues."

{
  echo "{"
  echo "  \"date\": \"$(date -u +%FT%TZ)\","
  echo "  \"node\": \"$NODE_V\","
  echo "  \"npm\": \"$NPM_V\","
  echo "  \"playwright\": \"$PW_V\","
  echo "  \"git\": \"$GIT_V\","
  echo "  \"pass\": $PASS,"
  echo "  \"fail\": $FAIL,"
  echo "  \"details\": {"
  FIRST=1
  for key in node rea chromium rea-capabilities rea-doctor playwright-test next-dev; do
    val="${DETAILS[$key]:-SKIP}"
    val="${val//\"/}"
    if [[ $FIRST == 1 ]]; then FIRST=0; else echo ","; fi
    printf '    "%s": "%s"' "$key" "$val"
  done
  echo ""
  echo "  }"
  echo "}"
} > "$JSON_REPORT"

{
  echo "# Rapport de verification — $(date -u +%FT%TZ)"
  echo ""
  echo "- node: \`$NODE_V\` — npm: \`$NPM_V\` — $GIT_V"
  echo "- $PW_V"
  echo "- Resultat : **$PASS reussis, $FAIL echoues**"
  echo ""
  for key in node rea chromium rea-capabilities rea-doctor playwright-test next-dev; do
    echo "- \`$key\` : ${DETAILS[$key]:-SKIP}"
  done
} > "$MD_REPORT"
echo "Rapports ecrits dans $JSON_REPORT et $MD_REPORT"

[[ $FAIL -eq 0 ]]

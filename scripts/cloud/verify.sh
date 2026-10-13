#!/usr/bin/env bash
# Vérifie l'environnement avec de VRAIES commandes ; n'invente aucun résultat.
# Sortie : reports/env-verification/<horodatage>/ (logs bruts + summary.md).
# Code retour : 1 si une vérification obligatoire échoue (REA doctor = avertissement,
# voir plus bas), 0 sinon. Variables : VERIFY_PORT (défaut 3100), VERIFY_SKIP_DEV=1.
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"
use_pinned_node

OUT="${VERIFY_OUT:-reports/env-verification/$(date -u +%Y%m%dT%H%M%SZ)}"
PORT="${VERIFY_PORT:-3100}"
mkdir -p "$OUT"
SUMMARY="$OUT/summary.md"
FAILED=0
printf '# Vérification environnement crm-lab\n\n| Vérification | Résultat | Détail |\n| --- | --- | --- |\n' >"$SUMMARY"

record() { # nom statut détail
  printf '| %s | %s | %s |\n' "$1" "$2" "$3" >>"$SUMMARY"
  printf '[%-4s] %s - %s\n' "$2" "$1" "$3"
  [ "$2" = "FAIL" ] && FAILED=1
  return 0
}

run_check() { # nom commande...  (log brut dans $OUT/<nom>.log ; détail = 1re ligne de sortie)
  local name="$1"; shift
  if "$@" >"$OUT/$name.log" 2>&1; then
    local detail
    case "${DETAIL:-first}" in
      last) detail="$(grep -v '^[[:space:]]*$' "$OUT/$name.log" | tail -n1)" ;;
      jq:*) detail="$(jq -r "${DETAIL#jq:}" "$OUT/$name.log")" ;;
      *) detail="$(head -n1 "$OUT/$name.log")" ;;
    esac
    record "$name" PASS "$(printf '%s' "${detail:-ok}" | cut -c1-110)"
  else
    record "$name" FAIL "exit $?, voir $OUT/$name.log"
  fi
}

# 1. Versions installées
run_check node-version bash -c 'v=$(node --version); node -e "const [a,b]=process.versions.node.split(\".\").map(Number); process.exit(a>24||(a===24&&b>=11)?0:1)" && echo "$v (>= 24.11)"'
run_check npm-version npm --version
run_check git-version git --version
run_check gcc-version bash -c 'gcc --version | head -n1'
run_check psql-version bash -c 'psql --version'
run_check rea-agents-installed bash -c 'v=$(npx --no-install rea-agents --version) && [ "$v" = "6.4.0" ] && echo "rea-agents $v"'
run_check playwright-version bash -c 'npx --no-install playwright --version'

# 2 + 4. Chromium via Playwright (binaire présent, lancement, JS, capture)
DETAIL='jq:[.[]|"\(.label) \(.version): lancement + JS + capture OK"]|join(" ; ")' run_check chromium-playwright node scripts/cloud/check-chromium.mjs "$OUT"
run_check playwright-chromium-installed bash -c 'node -e "const {chromium}=require(\"playwright\");const p=chromium.executablePath();require(\"fs\").accessSync(p,require(\"fs\").constants.X_OK);console.log(p)"'

# 3. CLI REA
run_check rea-capabilities bash -c 'npx --no-install rea-agents capabilities >"$0/rea-capabilities.out" && grep -q "^capabilities\[" "$0/rea-capabilities.out" && echo "$(grep -c "^  - operation:" "$0/rea-capabilities.out") opérations ($(grep -c "^    available: true" "$0/rea-capabilities.out") disponibles)"' "$OUT"
# `doctor` sort en code 1 tant que les moteurs d'analyse optionnels (Hopper, Ghidra, IDA)
# et l'enregistrement MCP ne sont pas configurés : ce n'est pas une panne d'installation.
# On exige un JSON valide + Node OK, et on liste les contrôles en échec sans les masquer.
npx --no-install rea-agents doctor --json >"$OUT/rea-doctor.json" 2>"$OUT/rea-doctor.err"
doctor_exit=$?
if jq -e '.scope_checks[]|select(.name=="node" and .ok==true)' "$OUT/rea-doctor.json" >/dev/null 2>&1; then
  failing="$(jq -r '[.checks[]|select(.ok==false)|.name]|join(", ")' "$OUT/rea-doctor.json")"
  if [ "$doctor_exit" -eq 0 ]; then
    record rea-doctor PASS "healthy=true"
  else
    record rea-doctor WARN "exit $doctor_exit ; node OK ; contrôles en échec : ${failing:-?}"
  fi
else
  record rea-doctor FAIL "JSON invalide ou Node non conforme (exit $doctor_exit), voir $OUT/rea-doctor.json"
fi

# Base de données + Prisma
bash scripts/cloud/postgres.sh >"$OUT/postgres.log" 2>&1 && record postgres PASS "$(tail -n1 "$OUT/postgres.log")" || record postgres FAIL "voir $OUT/postgres.log"
if [ -f .env ]; then set -a; . ./.env; set +a; else export DATABASE_URL="$(default_database_url)"; fi
DETAIL=last run_check prisma-validate npx --no-install prisma validate
DETAIL=last run_check prisma-migrate-status npx --no-install prisma migrate status

# Qualité du projet
run_check typecheck npm run --silent typecheck
run_check lint npm run --silent lint

# 5. Application de développement : démarrage réel + requête HTTP + base de données
if [ "${VERIFY_SKIP_DEV:-0}" = "1" ]; then
  record dev-server SKIP "VERIFY_SKIP_DEV=1"
else
  DEV_LOG="$OUT/dev-server.log"
  (setsid npm run dev -- --hostname 127.0.0.1 --port "$PORT" >"$DEV_LOG" 2>&1 & echo $! >"$OUT/dev-server.pid")
  DEV_PID="$(cat "$OUT/dev-server.pid")"
  ok=0
  for _ in $(seq 1 90); do
    if curl -fsS "http://127.0.0.1:$PORT/api/health" -o "$OUT/health.json" 2>/dev/null; then ok=1; break; fi
    kill -0 "$DEV_PID" 2>/dev/null || break
    sleep 1
  done
  if [ "$ok" = 1 ] && jq -e '.status=="ok" and .database=="up"' "$OUT/health.json" >/dev/null 2>&1; then
    home="$(curl -s -o "$OUT/home.html" -w '%{http_code}' "http://127.0.0.1:$PORT/")"
    [ "$home" = 200 ] && record dev-server PASS "GET / = 200 ; /api/health = $(jq -c . "$OUT/health.json")" \
                      || record dev-server FAIL "GET / = $home"
  else
    record dev-server FAIL "pas de réponse /api/health valide, voir $DEV_LOG"
  fi
  pkill -TERM -g "$DEV_PID" 2>/dev/null || kill "$DEV_PID" 2>/dev/null || true
  rm -f "$OUT/dev-server.pid"
fi

printf '\nRapport : %s\n' "$SUMMARY"
[ "$FAILED" -eq 0 ] && log "Vérification terminée sans échec obligatoire" || log "Au moins une vérification a échoué"
exit "$FAILED"

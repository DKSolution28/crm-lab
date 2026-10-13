#!/usr/bin/env bash
# launch-salesforce-browser.sh
# Lance une instance Chromium dédiée et isolée pour Salesforce Developer Org
# avec DevTools / CDP sur le port 9223 (profil distinct de crm-lab).
set -euo pipefail

SF_CDP_PORT="${SF_CDP_PORT:-9223}"
SF_PROFILE_DIR="${SF_PROFILE_DIR:-/tmp/salesforce-session-cdp}"
SF_LOGIN_URL="${1:-https://login.salesforce.com}"

echo "=========================================================="
echo "Lancement session Chromium Salesforce autorisée"
echo "Port CDP : ${SF_CDP_PORT}"
echo "Répertoire profil : ${SF_PROFILE_DIR}"
echo "URL cible : ${SF_LOGIN_URL}"
echo "=========================================================="

if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
  echo "Une session Chromium CDP écoute déjà sur http://127.0.0.1:${SF_CDP_PORT}"
  exit 0
fi

CHROMIUM_BIN="$(node -e 'import("playwright").then(m => console.log(m.chromium.executablePath()))')"
mkdir -p "${SF_PROFILE_DIR}"

"${CHROMIUM_BIN}" \
  --headless=new \
  --remote-debugging-port="${SF_CDP_PORT}" \
  --user-data-dir="${SF_PROFILE_DIR}" \
  --no-first-run \
  --no-default-browser-check \
  "${SF_LOGIN_URL}" \
  >/tmp/salesforce-cdp.log 2>&1 &

ready=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SF_CDP_PORT}/json/version" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "Erreur : Chromium DevTools n'a pas répondu sur le port ${SF_CDP_PORT}." >&2
  cat /tmp/salesforce-cdp.log >&2 || true
  exit 1
fi

echo "Chromium DevTools pour Salesforce est prêt sur http://127.0.0.1:${SF_CDP_PORT}"
curl -s "http://127.0.0.1:${SF_CDP_PORT}/json/version"
echo ""

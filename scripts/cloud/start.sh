#!/usr/bin/env bash
# Lancé à chaque démarrage d'agent (champ `start`). Idempotent, non bloquant :
# démarre PostgreSQL, applique les migrations, et — si CLOUD_START_DEV_SERVER=1 —
# lance `next dev` dans une session tmux nommée `dev`.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

use_pinned_node
bash "$REPO_ROOT/scripts/cloud/postgres.sh"

if [ -f .env ]; then
  set -a; . ./.env; set +a
else
  export DATABASE_URL="$(default_database_url)"
fi

if [ -d node_modules ]; then
  npx prisma migrate deploy
else
  log "node_modules absent : lancer 'bash scripts/cloud/install.sh'"
fi

if [ "${CLOUD_START_DEV_SERVER:-0}" = "1" ]; then
  port="${PORT:-3000}"
  if tmux has-session -t dev 2>/dev/null; then
    log "Session tmux 'dev' déjà active"
  else
    tmux new-session -d -s dev -c "$REPO_ROOT" \
      "PATH='$PATH' npm run dev -- --hostname 0.0.0.0 --port $port 2>&1 | tee /tmp/crm-lab-dev.log"
    log "next dev lancé dans tmux 'dev' (log : /tmp/crm-lab-dev.log, port $port)"
  fi
fi
log "start terminé"

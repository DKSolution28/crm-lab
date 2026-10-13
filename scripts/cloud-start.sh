#!/usr/bin/env bash
# Per-boot services for Cursor Cloud agents (environment `start`): PostgreSQL,
# migrations + demo seed, the CDP browser for REA, and `next dev` on port 3000
# in the `next-dev` tmux session. Safe to rerun.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/node-env.sh

echo "==> PostgreSQL"
if ! pg_isready -q -h localhost; then
  sudo service postgresql start
fi
for _ in $(seq 1 30); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -h localhost

echo "==> Database schema + demo data"
bash scripts/db-setup.sh --seed

echo "==> CDP browser"
bash scripts/start-cdp-browser.sh

echo "==> Next.js dev server"
DEV_URL="http://localhost:3000"
if curl -fsS -o /dev/null "$DEV_URL/api/health"; then
  echo "dev server already running at $DEV_URL"
elif tmux has-session -t next-dev 2>/dev/null; then
  echo "tmux session next-dev exists; waiting for it"
else
  tmux new-session -d -s next-dev -c "$ROOT" \
    "bash -lc 'source scripts/node-env.sh && npm run dev 2>&1 | tee /tmp/next-dev.log'"
fi

for _ in $(seq 1 120); do
  if curl -fsS "$DEV_URL/api/health" >/dev/null 2>&1; then
    curl -fsS "$DEV_URL/api/health"; echo
    echo "start complete"
    exit 0
  fi
  sleep 1
done
echo "dev server did not answer on $DEV_URL; see /tmp/next-dev.log" >&2
exit 1

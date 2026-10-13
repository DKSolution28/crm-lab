#!/usr/bin/env bash
# Per-boot services: PostgreSQL, schema migrations, and the Next.js dev server.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

bash scripts/ensure-database.sh

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

npx prisma migrate deploy

if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
  echo "Next.js dev server is already healthy on port 3000."
  exit 0
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000

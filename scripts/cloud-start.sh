#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:$PATH"

if command -v pg_isready >/dev/null 2>&1; then
  sudo service postgresql start
  for _ in {1..30}; do
    pg_isready -q && break
    sleep 1
  done
  pg_isready
fi

exec npm run dev -- --hostname 0.0.0.0 --port 3000

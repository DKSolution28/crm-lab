#!/usr/bin/env bash
# Idempotent repository bootstrap for Cursor Cloud Agent builds.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

bash scripts/ensure-node.sh

if ! command -v psql >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    postgresql \
    postgresql-contrib \
    build-essential \
    python3 \
    ca-certificates \
    curl \
    xz-utils \
    git
fi

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npx playwright install --with-deps chromium

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

npx prisma generate

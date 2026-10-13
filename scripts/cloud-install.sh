#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:$PATH"

required_major=24
required_minor=11
read -r major minor < <(node -p \
  'const [major, minor] = process.versions.node.split("."); `${major} ${minor}`')

if (( major < required_major || (major == required_major && minor < required_minor) )); then
  echo "Node.js 24.11+ is required; found $(node --version)." >&2
  exit 1
fi

npm ci
npx playwright install chromium
npx prisma generate

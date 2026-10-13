#!/usr/bin/env bash
# Installation reproductible de l'environnement du labo.
# Usage : ./scripts/setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Node.js 24 en tete de PATH (voir scripts/use-node24.sh pour le contexte).
# shellcheck disable=SC1091
source "$SCRIPT_DIR/use-node24.sh"
echo "node: $(node --version) | npm: $(npm --version)"

# 2. Dependances npm (rea-agents 6.4.0, Playwright, Next.js, Prisma...).
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 3. Navigateur Chromium + dependances systeme (sudo requis pour apt).
if sudo -n true 2>/dev/null; then
  npx playwright install --with-deps chromium
else
  npx playwright install chromium
fi

# 4. Client Prisma (ne necessite pas de base connectee).
npx prisma generate

echo "Installation terminee. Lancez ./scripts/verify.sh pour verifier."

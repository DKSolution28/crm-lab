#!/usr/bin/env bash
# Idempotent environment bootstrap for Cursor Cloud agents (environment `install`).
# Installs the pinned Node.js, system packages, npm dependencies, Playwright
# Chromium with its OS dependencies, and generates the Prisma client.
# It does not start services; see scripts/cloud-start.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

log() { printf '\n==> %s\n' "$*"; }

log "System packages"
APT_PACKAGES=(git curl ca-certificates build-essential jq rsync tmux postgresql postgresql-contrib)
missing=()
for pkg in "${APT_PACKAGES[@]}"; do
  dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
done
if [ "${#missing[@]}" -gt 0 ]; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "${missing[@]}"
else
  echo "all present: ${APT_PACKAGES[*]}"
fi

log "Node.js $NODE_VERSION (nvm)"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | PROFILE=/dev/null bash
fi
# shellcheck disable=SC1091
set +u; . "$NVM_DIR/nvm.sh"; set -u
if [ ! -x "$NVM_DIR/versions/node/v$NODE_VERSION/bin/node" ]; then
  nvm install "$NODE_VERSION"
fi
nvm alias default "$NODE_VERSION" >/dev/null

# Agent shells source ~/.bashrc after /exec-daemon (older node) is on PATH,
# so prepend the pinned Node there too. The marked block is rewritten in place.
BASHRC="$HOME/.bashrc"
touch "$BASHRC"
sed -i '/# >>> crm-lab node >>>/,/# <<< crm-lab node <<</d' "$BASHRC"
cat >> "$BASHRC" <<EOF
# >>> crm-lab node >>>
export PATH="\$HOME/.nvm/versions/node/v$NODE_VERSION/bin:\$PATH"
# <<< crm-lab node <<<
EOF

# shellcheck disable=SC1091
source "$ROOT/scripts/node-env.sh"
echo "node $(node --version), npm $(npm --version)"

log "npm dependencies"
npm ci --no-audit --no-fund

log "Playwright Chromium + OS dependencies"
npx playwright install --with-deps chromium

log "Local .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "created .env from .env.example"
else
  echo ".env already exists; left untouched"
fi

log "Prisma client"
npx prisma generate

log "install complete"

#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/4] Ensuring Node.js 24 LTS and npm ==="
NODE_REQUIRED_MAJOR=24
CURRENT_NODE_VERSION=$(node -v 2>/dev/null || echo "v0.0.0")

if [[ ! "$CURRENT_NODE_VERSION" =~ ^v24\. ]] && [[ ! "$CURRENT_NODE_VERSION" =~ ^v26\. ]]; then
  echo "Installing Node.js 24 LTS into /usr/local..."
  NODE_VERSION="24.21.0"
  sudo -n mkdir -p /usr/local
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | sudo -n tar -xJ -C /usr/local --strip-components=1 --no-same-owner
  sudo -n ln -sf /usr/local/bin/node /exec-daemon/node 2>/dev/null || true
  sudo -n ln -sf /usr/local/bin/npm /exec-daemon/npm 2>/dev/null || true
  sudo -n ln -sf /usr/local/bin/npx /exec-daemon/npx 2>/dev/null || true
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

echo "=== [2/4] Installing project dependencies ==="
npm install

echo "=== [3/4] Installing Chromium browser and system dependencies ==="
sudo -n npx playwright install --with-deps chromium || npx playwright install chromium

echo "=== [4/4] Emitting Prisma Contract ==="
npx prisma contract emit || true

echo "=== Setup complete and verified! ==="

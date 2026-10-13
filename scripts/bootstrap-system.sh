#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.21.0}"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) NODE_ARCH="x64" ;;
  aarch64|arm64) NODE_ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential \
  ca-certificates \
  curl \
  git \
  postgresql \
  postgresql-client \
  python3 \
  xz-utils

# Login shells used by Cursor must prefer the pinned runtime over any inherited
# tool-runner or version-manager PATH entries.
printf '%s\n' 'export PATH="/usr/local/bin:$PATH"' |
  sudo tee /etc/profile.d/zz-crm-lab-node.sh >/dev/null
export PATH="/usr/local/bin:$PATH"

CURRENT_NODE="$(node --version 2>/dev/null || true)"
if [[ "$CURRENT_NODE" != "v${NODE_VERSION}" ]]; then
  archive="node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT
  curl -fsSLO --output-dir "$tmp_dir" \
    "https://nodejs.org/dist/v${NODE_VERSION}/${archive}"
  sudo tar -xJf "$tmp_dir/$archive" -C /usr/local \
    --strip-components=1 --no-same-owner
fi

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # Cursor's interactive terminals load NVM from .bashrc.
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm install "$NODE_VERSION"
  nvm alias default "$NODE_VERSION"
  nvm use "$NODE_VERSION"
fi

node --version
npm --version
git --version

# Installs Chromium plus the matching Debian/Ubuntu runtime libraries.
npx --yes playwright@1.64.0 install --with-deps chromium

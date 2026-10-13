#!/usr/bin/env bash
# Install the Node.js version pinned in .nvmrc and expose it system-wide.
#
# - Uses nvm when the image provides it (Cursor's default image does), so
#   interactive shells also default to the pinned version.
# - Otherwise downloads the official tarball into /usr/local/lib/nodejs.
# - Always maintains /usr/local/lib/nodejs/current -> <install dir> and
#   /usr/local/bin/{node,npm,npx,corepack} symlinks. scripts/cloud/env.sh
#   prepends /usr/local/lib/nodejs/current/bin to PATH.
#
# Idempotent: re-running with the same .nvmrc is a no-op apart from symlinks.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_VERSION="${NODE_VERSION:-$(tr -d '[:space:]' < "$ROOT/.nvmrc")}"
NODE_VERSION="${NODE_VERSION#v}"
SYSTEM_PREFIX=/usr/local/lib/nodejs
CURRENT_LINK="$SYSTEM_PREFIX/current"

log() { printf '[install-node] %s\n' "$*"; }

if [ -x "$CURRENT_LINK/bin/node" ] && [ "$("$CURRENT_LINK/bin/node" --version)" = "v$NODE_VERSION" ]; then
  log "Node v$NODE_VERSION already current at $CURRENT_LINK"
  NODE_HOME="$(readlink -f "$CURRENT_LINK")"
else
  NODE_HOME=""
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    log "Installing Node v$NODE_VERSION with nvm"
    # nvm.sh is not written for `set -u`.
    set +u
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install "$NODE_VERSION" >/dev/null
    nvm alias default "$NODE_VERSION" >/dev/null
    set -u
    NODE_HOME="$NVM_DIR/versions/node/v$NODE_VERSION"
  else
    ARCH="$(uname -m)"
    case "$ARCH" in
      x86_64) NODE_ARCH=x64 ;;
      aarch64 | arm64) NODE_ARCH=arm64 ;;
      *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
    esac
    TARBALL="node-v$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
    log "Downloading https://nodejs.org/dist/v$NODE_VERSION/$TARBALL"
    TMP="$(mktemp -d)"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$TARBALL" -o "$TMP/$TARBALL"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
    (cd "$TMP" && grep " $TARBALL\$" SHASUMS256.txt | sha256sum -c - >/dev/null)
    sudo mkdir -p "$SYSTEM_PREFIX"
    sudo tar -xJf "$TMP/$TARBALL" -C "$SYSTEM_PREFIX"
    rm -rf "$TMP"
    NODE_HOME="$SYSTEM_PREFIX/node-v$NODE_VERSION-linux-$NODE_ARCH"
  fi
  sudo mkdir -p "$SYSTEM_PREFIX"
  sudo ln -sfn "$NODE_HOME" "$CURRENT_LINK"
fi

for bin in node npm npx corepack; do
  if [ -e "$NODE_HOME/bin/$bin" ]; then
    sudo ln -sfn "$CURRENT_LINK/bin/$bin" "/usr/local/bin/$bin"
  fi
done

log "node $("$CURRENT_LINK/bin/node" --version), npm $("$CURRENT_LINK/bin/npm" --version) -> $CURRENT_LINK"

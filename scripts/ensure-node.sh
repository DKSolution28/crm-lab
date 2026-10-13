#!/usr/bin/env bash
# Install Node.js 24.21.0 under /usr/local when the active node is older than 24.11.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.21.0}"
export PATH="/usr/local/bin:${PATH}"

node_satisfies() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const [maj, min] = process.versions.node.split(".").map(Number); if (!((maj === 24 && min >= 11) || maj > 24)) process.exit(1);'
}

if ! node_satisfies; then
  archive="$(mktemp)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o "${archive}"
  sudo tar -xJf "${archive}" -C /usr/local --strip-components=1
  rm -f "${archive}"
fi

bashrc="${HOME}/.bashrc"
path_line='export PATH="/usr/local/bin:$PATH"'
if [[ -f "${bashrc}" ]] && ! grep -qxF "${path_line}" "${bashrc}"; then
  printf '\n# Prefer the Cloud Agent Node.js toolchain over earlier PATH entries.\n%s\n' "${path_line}" >> "${bashrc}"
fi

hash -r || true
echo "node $(node --version) ($(command -v node))"
echo "npm $(npm --version) ($(command -v npm))"

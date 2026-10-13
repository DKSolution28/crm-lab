# shellcheck shell=bash
# Source this file (`source scripts/node-env.sh`) to put the project's pinned
# Node.js first on PATH. Cursor Cloud injects /exec-daemon (which ships its own
# older `node`) ahead of nvm, so the pinned version must be prepended explicitly.

_crm_lab_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRM_LAB_NODE_VERSION="$(tr -d '[:space:]' < "$_crm_lab_root/.nvmrc")"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
_crm_lab_node_bin="$NVM_DIR/versions/node/v$CRM_LAB_NODE_VERSION/bin"

if [ -x "$_crm_lab_node_bin/node" ]; then
  case ":$PATH:" in
    "$_crm_lab_node_bin:"*) ;;
    *) export PATH="$_crm_lab_node_bin:$PATH" ;;
  esac
else
  echo "node-env: Node $CRM_LAB_NODE_VERSION missing; run scripts/cloud-install.sh" >&2
fi

if [ -z "${REA_BROWSER_EXECUTABLE:-}" ] && [ -d "$_crm_lab_root/node_modules/playwright" ]; then
  REA_BROWSER_EXECUTABLE="$(cd "$_crm_lab_root" && node -e 'process.stdout.write(require("playwright").chromium.executablePath())' 2>/dev/null || true)"
  [ -x "$REA_BROWSER_EXECUTABLE" ] && export REA_BROWSER_EXECUTABLE || unset REA_BROWSER_EXECUTABLE
fi

unset _crm_lab_root _crm_lab_node_bin

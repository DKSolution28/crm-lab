# Fixe Node.js 24 pour ce projet.
#
# Contexte : sur les VMs Cursor Cloud, /exec-daemon/node (Node 22.14.0)
# precede le Node installe via nvm dans le PATH. REA exige
# Node.js 22.19+, 24.11+ ou 26+, donc il faut forcer Node 24 en tete de PATH.
#
# Usage : source scripts/use-node24.sh
#   puis `node --version` doit afficher v24.21.0 (ou superieur).

if [ -n "${BASH_SOURCE:-}" ]; then
  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  _SCRIPT_DIR="$(pwd)/scripts"
fi
_PROJECT_ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"

if [ -f "$_PROJECT_ROOT/.nvmrc" ]; then
  _WANTED_NODE="$(tr -d ' \t\r\n' < "$_PROJECT_ROOT/.nvmrc")"
else
  _WANTED_NODE="24.21.0"
fi

_NVM_NODE_BIN="$HOME/.nvm/versions/node/v${_WANTED_NODE#v}/bin"
if [ ! -x "$_NVM_NODE_BIN/node" ]; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" --no-use
    nvm install "$_WANTED_NODE"
    nvm alias default "$_WANTED_NODE"
  else
    echo "ERREUR: nvm introuvable et $_NVM_NODE_BIN/node absent." >&2
    return 1 2>/dev/null || exit 1
  fi
fi

case ":$PATH:" in
  *":$_NVM_NODE_BIN:"*) ;;
  *) export PATH="$_NVM_NODE_BIN:$PATH" ;;
esac
hash -r 2>/dev/null || true

unset _SCRIPT_DIR _PROJECT_ROOT _WANTED_NODE _NVM_NODE_BIN

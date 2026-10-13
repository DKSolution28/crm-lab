#!/usr/bin/env bash
# Installation reproductible de l'environnement Cursor Cloud (idempotente, non interactive).
# Prépare : paquets système, Node.js épinglé (.nvmrc), dépendances npm, Chromium
# Playwright (+ dépendances système), PostgreSQL local, client Prisma et migrations.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$REPO_ROOT"

APT_PACKAGES=(build-essential git curl ca-certificates jq unzip xz-utils tmux xvfb postgresql postgresql-contrib libpq-dev)

install_system_packages() {
  local missing=()
  for pkg in "${APT_PACKAGES[@]}"; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing+=("$pkg")
  done
  if [ "${#missing[@]}" -eq 0 ]; then
    log "Paquets système déjà présents"
    return
  fi
  log "Installation des paquets système : ${missing[*]}"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${missing[@]}"
}

# Node est téléchargé depuis nodejs.org, vérifié par SHA-256 puis rangé comme nvm
# le fait (~/.nvm/versions/node/vX.Y.Z), sans dépendre d'un script de profil.
install_node() {
  local v="$NODE_VERSION_PIN" dir="$NVM_DIR/versions/node/v${NODE_VERSION_PIN}"
  if [ -x "$dir/bin/node" ] && [ "$("$dir/bin/node" --version)" = "v$v" ]; then
    log "Node v$v déjà installé"
  else
    local tarball="node-v${v}-linux-x64.tar.xz" tmp
    tmp="$(mktemp -d)"
    log "Téléchargement de Node v$v"
    curl -fsSL "https://nodejs.org/dist/v${v}/${tarball}" -o "$tmp/$tarball"
    curl -fsSL "https://nodejs.org/dist/v${v}/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
    (cd "$tmp" && grep " ${tarball}\$" SHASUMS256.txt | sha256sum -c -)
    mkdir -p "$dir"
    tar -xJf "$tmp/$tarball" -C "$dir" --strip-components=1 --no-same-owner
    rm -rf "$tmp"
  fi
  mkdir -p "$NVM_DIR/alias" && echo "$v" >"$NVM_DIR/alias/default"
  for bin in node npm npx corepack; do
    sudo ln -sf "$dir/bin/$bin" "/usr/local/bin/$bin"
  done
  configure_shell_path "$dir/bin"
}

# Le PATH de base de l'image place /exec-daemon (Node 22) avant /usr/local/bin :
# on préfixe donc le PATH des shells de login/interactifs avec le Node épinglé.
configure_shell_path() {
  local bin="$1" begin="# >>> crm-lab node >>>" end="# <<< crm-lab node <<<" f tmp
  for f in "$HOME/.profile" "$HOME/.bashrc"; do
    [ -f "$f" ] || touch "$f"
    tmp="$(mktemp)"
    sed "/^${begin}\$/,/^${end}\$/d" "$f" >"$tmp"
    if [ "$f" = "$HOME/.bashrc" ]; then
      { printf '%s\nexport PATH="%s:$PATH"\n%s\n' "$begin" "$bin" "$end"; cat "$tmp"; } >"$f"
    else
      { cat "$tmp"; printf '%s\nexport PATH="%s:$PATH"\n%s\n' "$begin" "$bin" "$end"; } >"$f"
    fi
    rm -f "$tmp"
  done
}

ensure_env_file() {
  if [ ! -f .env ]; then
    log "Création de .env (valeurs de dev locales, ignoré par git)"
    printf 'DATABASE_URL="%s"\n' "$(default_database_url)" >.env
  fi
}

install_system_packages
install_node
use_pinned_node
assert_node_version
log "node $(node --version) / npm $(npm --version)"

npm ci --no-audit --no-fund
npx playwright install --with-deps chromium

ensure_env_file
bash "$REPO_ROOT/scripts/cloud/postgres.sh"
set -a; . ./.env; set +a
npx prisma generate
npx prisma migrate deploy
log "Installation terminée"

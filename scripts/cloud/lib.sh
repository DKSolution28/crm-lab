#!/usr/bin/env bash
# Fonctions partagées par les scripts cloud. À sourcer, pas à exécuter.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_VERSION_PIN="${NODE_VERSION_PIN:-$(tr -d '[:space:]v' <"$REPO_ROOT/.nvmrc")}"
NODE_MIN_MAJOR=24
NODE_MIN_MINOR=11
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

log() { printf '[cloud] %s\n' "$*"; }
die() { printf '[cloud][erreur] %s\n' "$*" >&2; exit 1; }

# Place le Node épinglé (.nvmrc) en tête du PATH. Le PATH de base de l'image
# contient /exec-daemon/node (Node 22) et nvm v22, qui sinon gagneraient.
use_pinned_node() {
  local bin="$NVM_DIR/versions/node/v${NODE_VERSION_PIN}/bin"
  [ -x "$bin/node" ] || die "Node ${NODE_VERSION_PIN} absent (lancer scripts/cloud/install.sh)"
  case ":$PATH:" in
    *":$bin:"*) PATH="$bin:${PATH//:$bin:/:}" ;;
    *) PATH="$bin:$PATH" ;;
  esac
  export PATH
}

assert_node_version() {
  local v major minor
  v="$(node --version | tr -d v)"
  major="${v%%.*}"; minor="${v#*.}"; minor="${minor%%.*}"
  if [ "$major" -lt "$NODE_MIN_MAJOR" ] || { [ "$major" -eq "$NODE_MIN_MAJOR" ] && [ "$minor" -lt "$NODE_MIN_MINOR" ]; }; then
    die "Node ${v} < ${NODE_MIN_MAJOR}.${NODE_MIN_MINOR} (requis par REA)"
  fi
}

# Identifiants de DÉVELOPPEMENT LOCAL uniquement (cluster PostgreSQL de la VM,
# non exposé). Ce ne sont pas des secrets ; surchargeables par l'environnement.
PG_DB="${CRM_LAB_PG_DB:-crm_lab}"
PG_USER="${CRM_LAB_PG_USER:-crm_lab}"
PG_PASSWORD="${CRM_LAB_PG_PASSWORD:-crm_lab_dev_only}"
PG_HOST="${CRM_LAB_PG_HOST:-127.0.0.1}"
PG_PORT="${CRM_LAB_PG_PORT:-5432}"
default_database_url() {
  printf 'postgresql://%s:%s@%s:%s/%s?schema=public' "$PG_USER" "$PG_PASSWORD" "$PG_HOST" "$PG_PORT" "$PG_DB"
}

#!/usr/bin/env bash
# Démarre PostgreSQL (idempotent) et crée le rôle + la base de dev locaux.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PG_VERSION="$(ls /usr/lib/postgresql | sort -V | tail -1)"

start_postgres() {
  if pg_isready -q -h "$PG_HOST" -p "$PG_PORT"; then
    log "PostgreSQL déjà démarré"
  else
    log "Démarrage de PostgreSQL ${PG_VERSION}"
    sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || sudo service postgresql start
  fi
  for _ in $(seq 1 30); do
    pg_isready -q -h "$PG_HOST" -p "$PG_PORT" && return 0
    sleep 1
  done
  die "PostgreSQL ne répond pas sur ${PG_HOST}:${PG_PORT}"
}

ensure_role_and_db() {
  local psql_admin=(sudo -u postgres psql -v ON_ERROR_STOP=1 -qtA)
  if [ "$("${psql_admin[@]}" -c "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'")" != "1" ]; then
    "${psql_admin[@]}" -c "CREATE ROLE \"${PG_USER}\" LOGIN PASSWORD '${PG_PASSWORD}' CREATEDB"
  fi
  if [ "$("${psql_admin[@]}" -c "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'")" != "1" ]; then
    "${psql_admin[@]}" -c "CREATE DATABASE \"${PG_DB}\" OWNER \"${PG_USER}\""
  fi
}

start_postgres
ensure_role_and_db
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -qtA -c "SELECT 1" >/dev/null \
  || die "Connexion impossible avec ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
log "PostgreSQL prêt (${PG_VERSION}) : base ${PG_DB}, rôle ${PG_USER}"

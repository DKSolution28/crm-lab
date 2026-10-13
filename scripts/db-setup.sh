#!/usr/bin/env bash
# Idempotently create the local dev role/database, apply Prisma migrations and
# (with --seed) load fictitious demo data. Requires PostgreSQL to be running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/node-env.sh

DB_USER="crm_lab"
DB_NAME="crm_lab"
DB_PASSWORD="crm_lab" # local-only throwaway credential, matches .env.example

psql_admin() { sudo -u postgres psql -v ON_ERROR_STOP=1 -tA "$@"; }

if [ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" != "1" ]; then
  # CREATEDB lets `prisma migrate dev` create its shadow database.
  psql_admin -c "CREATE ROLE $DB_USER LOGIN CREATEDB PASSWORD '$DB_PASSWORD'"
  echo "created role $DB_USER"
fi
if [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]; then
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  echo "created database $DB_NAME"
fi

[ -f .env ] || cp .env.example .env

npx prisma migrate deploy

if [ "${1:-}" = "--seed" ]; then
  npx prisma db seed
fi

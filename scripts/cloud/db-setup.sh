#!/usr/bin/env bash
# Prepare the local PostgreSQL database for crm-lab. Idempotent.
#
# - Creates role + database named in DATABASE_URL (default crm_lab/crm_lab)
# - Applies committed Prisma migrations (prisma migrate deploy)
# - Seeds demo data when the database is empty
#
# Requires PostgreSQL to be running (start.sh handles that).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source scripts/cloud/env.sh

[ -f .env ] || cp .env.example .env
# shellcheck disable=SC1091
set -a; source .env; set +a

log() { printf '[db-setup] %s\n' "$*"; }

# postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public
URL_NO_SCHEME="${DATABASE_URL#*://}"
CREDS="${URL_NO_SCHEME%%@*}"
REST="${URL_NO_SCHEME#*@}"
DB_USER="${CREDS%%:*}"
DB_PASSWORD="${CREDS#*:}"
DB_NAME="${REST#*/}"
DB_NAME="${DB_NAME%%\?*}"

if ! pg_isready -q; then
  echo "PostgreSQL is not accepting connections; run scripts/cloud/start.sh first." >&2
  exit 1
fi

role_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")"
if [ "$role_exists" != "1" ]; then
  log "Creating role $DB_USER"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q \
    -c "CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASSWORD' CREATEDB;"
else
  log "Role $DB_USER exists"
fi

db_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")"
if [ "$db_exists" != "1" ]; then
  log "Creating database $DB_NAME"
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
else
  log "Database $DB_NAME exists"
fi

log "Applying migrations"
npx prisma migrate deploy

log "Seeding (skipped automatically when data already exists)"
npx prisma db seed

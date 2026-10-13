#!/usr/bin/env bash
# Start local PostgreSQL and ensure the peer-authenticated lab database exists.
set -euo pipefail

export PATH="/usr/local/bin:${PATH}"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready is not installed. Run scripts/cloud-agent-install.sh first." >&2
  exit 1
fi

hba="$(ls /etc/postgresql/*/main/pg_hba.conf | head -n 1)"
if [[ -n "${hba}" ]]; then
  sudo sed -i -E \
    -e 's/^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1\/32[[:space:]]+)scram-sha-256/\1trust/' \
    -e 's/^(host[[:space:]]+all[[:space:]]+all[[:space:]]+::1\/128[[:space:]]+)scram-sha-256/\1trust/' \
    "${hba}"
fi

if ! pg_isready -q; then
  sudo service postgresql start
else
  sudo service postgresql reload
fi

ready=0
for _ in $(seq 1 30); do
  if pg_isready -q; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "PostgreSQL did not become ready." >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ubuntu') THEN
    CREATE ROLE ubuntu WITH LOGIN SUPERUSER;
  END IF;
END
$$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'crm_lab'" | grep -q 1; then
  sudo -u postgres createdb --owner=ubuntu crm_lab
fi

echo "PostgreSQL ready: database crm_lab, role ubuntu"

#!/usr/bin/env bash
# Print the toolchain checks for this lab. Output is the command result, not a summary invented ahead of time.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

section() {
  printf '\n== %s ==\n' "$1"
}

section "versions"
echo "node $(node --version) ($(command -v node))"
echo "npm $(npm --version) ($(command -v npm))"
echo "npx $(npx --version) ($(command -v npx))"
echo "git $(git --version)"
if command -v psql >/dev/null 2>&1; then
  psql --version
else
  echo "psql: not installed"
fi
echo "rea-agents package: $(node -p 'require("./node_modules/rea-agents/package.json").version')"
echo "playwright package: $(node -p 'require("./node_modules/playwright/package.json").version')"

section "chromium via playwright"
node scripts/check-playwright-browser.mjs
chromium_bin="$(node -e 'import("playwright").then(m => console.log(m.chromium.executablePath()))')"
echo "chromium binary: ${chromium_bin}"
"${chromium_bin}" --version

section "rea capabilities"
npx rea-agents@6.4.0 capabilities

section "rea doctor"
set +e
npx rea-agents@6.4.0 doctor --json
doctor_status=$?
set -e
echo "rea doctor exit: ${doctor_status}"

section "playwright browser availability"
npx playwright --version

if curl -fsS "http://127.0.0.1:3000/api/health"; then
  echo
  section "dev server health"
  echo "GET /api/health succeeded"
else
  echo
  echo "dev server is not responding on http://127.0.0.1:3000/api/health"
fi

#!/usr/bin/env bash
set -uo pipefail

echo "=========================================================="
echo " Verification: Salesforce Reverse Engineering Environment "
echo "=========================================================="

echo ""
echo "[1] Node.js and Package Manager Versions:"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo "Git:  $(git --version)"

echo ""
echo "[2] REA CLI Capabilities & Diagnostics:"
echo "--- npx rea-agents@6.4.0 capabilities (excerpt) ---"
npx rea-agents@6.4.0 capabilities > /tmp/rea-caps.txt 2>&1 || true
head -n 25 /tmp/rea-caps.txt

echo ""
echo "--- npx rea-agents@6.4.0 doctor --json (excerpt) ---"
npx rea-agents@6.4.0 doctor --json > /tmp/rea-doctor.json 2>&1 || true
python3 -c "import json; d=json.load(open('/tmp/rea-doctor.json')); print('Healthy checks:', [c['name'] for c in d.get('checks', []) if c.get('ok')]); print('Scope checks count:', len(d.get('scope_checks', []))); print('Tools count:', len(d.get('identity', {}).get('catalog', {}).get('tools', [])))" 2>/dev/null || head -c 200 /tmp/rea-doctor.json

echo ""
echo "[3] Playwright & Chromium Verification:"
npx tsx scripts/verify-browser.ts

echo ""
echo "[4] Playwright Automated Test:"
npx playwright test tests/chromium.test.ts

echo ""
echo "=========================================================="
echo " All verifications completed! "
echo "=========================================================="

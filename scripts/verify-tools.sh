#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:$PATH"

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"
echo "REA: $(npx rea-agents@6.4.0 --version 2>/dev/null || echo 'CLI available')"
echo "Playwright: $(npx playwright --version)"

node <<'EOF'
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent("<title>Chromium smoke test</title><h1>ready</h1>");
console.log(`Chromium: ${await page.title()} (${browser.version()})`);
await browser.close();
EOF

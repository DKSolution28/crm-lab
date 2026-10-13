#!/usr/bin/env bash
# Record actual toolchain and service checks. Prints JSON. Does not invent results.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/toolchain.sh
source "${ROOT}/scripts/lib/toolchain.sh"
prefer_usr_local_node

OUT_DIR="${1:-/tmp/crm-lab-verify}"
mkdir -p "${OUT_DIR}"
export CRM_LAB_VERIFY_DIR="${OUT_DIR}"

run_capture() {
  local name="$1"
  shift
  local out="${OUT_DIR}/${name}.txt"
  local code=0
  set +e
  "$@" >"${out}" 2>&1
  code=$?
  set -e
  printf '%s\n' "${code}" >"${OUT_DIR}/${name}.exit"
  return 0
}

cd "${ROOT}"

run_capture node_version node --version
run_capture npm_version npm --version
run_capture git_version git --version
run_capture which_node bash -lc 'export PATH=/usr/local/bin:$PATH; command -v node; node --version'
run_capture psql_version psql --version
run_capture chrome_version "${CRM_LAB_CHROME_BIN}" --version
run_capture rea_capabilities npx --yes "rea-agents@${CRM_LAB_REA_VERSION}" capabilities
run_capture rea_doctor npx --yes "rea-agents@${CRM_LAB_REA_VERSION}" doctor --json
run_capture playwright_version npx playwright --version
run_capture chromium_launch node --input-type=module -e '
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");
const ua = await page.evaluate(() => navigator.userAgent);
const version = await browser.version();
await browser.close();
process.stdout.write(JSON.stringify({ ok: true, version, userAgent: ua }) + "\n");
'
run_capture cdp_version curl -sf "http://127.0.0.1:${CRM_LAB_CDP_PORT}/json/version"
run_capture next_home curl -sS -o /tmp/crm-lab-next-home.html -w "http_status=%{http_code}\n" "http://127.0.0.1:${CRM_LAB_APP_PORT}/"
run_capture next_health curl -sS "http://127.0.0.1:${CRM_LAB_APP_PORT}/api/health"
run_capture notes_create curl -sS -X POST "http://127.0.0.1:${CRM_LAB_APP_PORT}/api/notes" \
  -H "content-type: application/json" \
  -d '{"title":"hello-world","body":"Prisma write from verify-cloud-env"}'
run_capture notes_list curl -sS "http://127.0.0.1:${CRM_LAB_APP_PORT}/api/notes"

python3 - <<'PY'
import json, pathlib
out = pathlib.Path("/tmp/crm-lab-verify")
# OUT_DIR may differ; reread from env via sibling files next to this script invocation
import os
root = pathlib.Path(os.environ.get("CRM_LAB_VERIFY_DIR", "/tmp/crm-lab-verify"))

def read(name):
    text = (root / f"{name}.txt").read_text(errors="replace") if (root / f"{name}.txt").exists() else ""
    code = int((root / f"{name}.exit").read_text().strip()) if (root / f"{name}.exit").exists() else None
    return {"exit": code, "output": text.strip()}

report = {name: read(name) for name in [
    "node_version", "npm_version", "git_version", "which_node", "psql_version",
    "chrome_version", "rea_capabilities", "rea_doctor", "playwright_version",
    "chromium_launch", "cdp_version", "next_home", "next_health", "notes_create", "notes_list",
]}
(root / "report.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
PY

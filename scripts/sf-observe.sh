#!/usr/bin/env bash
# Observe the current Lightning page of the Salesforce session with REA:
# list-browser-targets -> inspect-web-page -> capture-web-screenshot.
# Raw outputs stay outside the repository (SF_OUT, default /tmp/sf-explore);
# scripts/sf-redact-evidence.mjs derives the committed, anonymised summaries.
#
# Usage: bash scripts/sf-observe.sh <screen-id> [extra inspect-web-page flags]
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:${PATH}"

screen="${1:?screen id required, e.g. LST-1}"
shift || true
endpoint="${SF_CDP_ENDPOINT:-http://127.0.0.1:9223}"
out="${SF_OUT:-/tmp/sf-explore}"
observation_ms="${SF_OBSERVATION_MS:-2000}"
mkdir -p "${out}"

rea() { npx rea-agents@6.4.0 "$@"; }

rea list-browser-targets "${endpoint}" --format json > "${out}/${screen}.targets.json"
target_id="$(node -e '
const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const t = d.normalized_result.targets.find((x) => /lightning\.force\.com|my\.salesforce\.com|salesforce-setup\.com/.test(x.url));
if (!t) { console.error("no Lightning target"); process.exit(1); }
console.log(t.target_id);
' "${out}/${screen}.targets.json")"

rea inspect-web-page "${endpoint}" "${target_id}" \
  --include-accessibility-text \
  --include-storage-keys \
  --observation-ms "${observation_ms}" \
  "$@" \
  --format json > "${out}/${screen}.inspect.json"

rea capture-web-screenshot "${endpoint}" "${target_id}" --format json > "${out}/${screen}.screenshot.json"

node -e '
const fs = require("fs");
const [inspectPath, shotPath, pngPath] = process.argv.slice(1);
const inspect = JSON.parse(fs.readFileSync(inspectPath, "utf8"));
const shot = JSON.parse(fs.readFileSync(shotPath, "utf8"));
fs.writeFileSync(pngPath, Buffer.from(shot.normalized_result.artifact.data_base64, "base64"));
const n = inspect.normalized_result;
const host = new URL(n.target.url).host.replace(/^[^.]+/, "<mydomain>");
console.log(JSON.stringify({
  screen: process.env.SCREEN,
  evidence_id: inspect.evidence_id,
  screenshot_evidence_id: shot.evidence_id,
  title: n.target.title,
  url: n.target.url.replace(new URL(n.target.url).host, host),
  dom_nodes: n.dom.total_nodes,
  accessibility_nodes: n.accessibility.total_nodes,
  scripts: n.scripts.total,
  network_requests: n.network.requests.length,
  completeness: n.completeness.status,
  screenshot_sha256: shot.normalized_result.artifact.sha256,
}, null, 2));
' "${out}/${screen}.inspect.json" "${out}/${screen}.screenshot.json" "${out}/${screen}.png"

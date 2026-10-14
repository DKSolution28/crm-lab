// Turn raw REA observations of a Salesforce screen (produced by sf-observe.sh)
// into anonymised, committable evidence: a JSON summary and the screenshot.
// Redaction rules live outside the repository (SF_REDACTION_FILE) because
// they name the very things that must not be committed.
//
// Usage: node scripts/sf-redact-evidence.mjs <screen-id> [more screen ids]
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const inDir = process.env.SF_OUT ?? "/tmp/sf-explore";
const outDir = process.env.SF_EVIDENCE_DIR ?? "docs/reverse-engineering/accounts/evidence";
const datePrefix = process.env.SF_EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
const rules = JSON.parse(readFileSync(process.env.SF_REDACTION_FILE ?? "/tmp/sf-explore/redaction.json", "utf8")).replacements;

const redact = (value) => {
  if (typeof value === "string") {
    let next = value;
    for (const [pattern, flags, replacement] of rules) next = next.replace(new RegExp(pattern, flags), replacement);
    return next;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]));
  return value;
};

const interestingRoles = new Set([
  "heading", "button", "link", "tab", "tabpanel", "textbox", "combobox", "checkbox", "radio", "menuitem",
  "menuitemcheckbox", "menuitemradio", "option", "listbox", "table", "grid", "columnheader", "rowheader",
  "dialog", "alertdialog", "alert", "status", "navigation", "region", "search", "searchbox", "switch",
  "spinbutton", "slider", "treeitem", "group", "form", "article", "main", "banner", "complementary", "contentinfo",
]);

const summarise = (screen) => {
  const inspect = JSON.parse(readFileSync(`${inDir}/${screen}.inspect.json`, "utf8"));
  const shot = JSON.parse(readFileSync(`${inDir}/${screen}.screenshot.json`, "utf8"));
  const n = inspect.normalized_result;
  const named = n.accessibility.nodes
    .filter((node) => !node.ignored && node.name && interestingRoles.has(node.role))
    .map((node) => ({ role: node.role, name: node.name, states: node.states?.length ? node.states : undefined }));
  const requests = n.network.requests.map((r) => ({
    method: r.method,
    url: r.url.split("?")[0],
    resource_type: r.resource_type,
    status: r.status,
  }));
  const summary = {
    screen,
    captured_at: n.capture_window.started_at,
    commands: [
      `bash scripts/sf-observe.sh ${screen}`,
      `node scripts/sf-redact-evidence.mjs ${screen}`,
    ],
    inspect_evidence_id: inspect.evidence_id,
    screenshot_evidence_id: shot.evidence_id,
    provider: inspect.provider,
    confidence: inspect.confidence,
    target: { title: n.target.title, url: n.target.url, origin: n.target.origin },
    completeness: n.completeness,
    dom: { total_nodes: n.dom.total_nodes },
    accessibility: {
      total_nodes: n.accessibility.total_nodes,
      text_capture: n.accessibility.text_capture,
      named_nodes: named,
    },
    scripts: { total: n.scripts.total },
    network: {
      request_count: n.network.requests.length,
      prior_activity_available: n.network.prior_activity_available,
      requests,
      websocket_connections: n.network.websocket_connections.map((w) => w.url.split("?")[0]),
    },
    storage: {
      local_storage_keys: n.storage.local_storage_keys,
      session_storage_keys: n.storage.session_storage_keys,
      indexed_db_names: n.storage.indexed_db_names,
      values_redacted: n.storage.values_redacted,
    },
    screenshot: {
      file: `${datePrefix}-${screen}.png`,
      sha256: shot.normalized_result.artifact.sha256,
      bytes: shot.normalized_result.artifact.bytes,
      viewport: shot.normalized_result.viewport,
      note: "Capture prise après masquage local des données personnelles (sf-act {\"mask\":true}); aucune donnée Salesforce modifiée.",
    },
    limitations: inspect.limitations,
  };
  return redact(summary);
};

mkdirSync(outDir, { recursive: true });
for (const screen of process.argv.slice(2)) {
  const summary = summarise(screen);
  writeFileSync(`${outDir}/${datePrefix}-${screen}.json`, `${JSON.stringify(summary, null, 2)}\n`);
  copyFileSync(`${inDir}/${screen}.png`, `${outDir}/${datePrefix}-${screen}.png`);
  console.log(`${screen}: ${summary.accessibility.named_nodes.length} named nodes, ${summary.network.request_count} requests -> ${outDir}/${datePrefix}-${screen}.{json,png}`);
}

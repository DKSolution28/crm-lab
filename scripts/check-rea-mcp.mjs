// Drive the REA MCP server over stdio the way an agent client does, then call
// list_browser_targets and inspect_web_page against the loopback CDP browser.
// Prints the result as JSON and exits non-zero when any step fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const endpoint = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9222";
const pageOrigin = process.env.CHECK_ORIGIN ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? null;

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "rea-agents@6.4.0", "mcp"],
  stderr: "pipe",
});
const client = new Client({ name: "crm-lab-check", version: "0.1.0" });
await client.connect(transport);

const unwrap = (result) => {
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const save = (name, value) => {
  if (!outDir) return;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/${name}`, JSON.stringify(value, null, 2));
};

const report = { server: client.getServerVersion?.() ?? null };

const { tools } = await client.listTools();
const names = new Set(tools.map((tool) => tool.name));
report.tool_count = tools.length;
report.browser_tools = Object.fromEntries(
  ["list_browser_targets", "inspect_web_page", "capture_web_screenshot", "observe_web_session"].map(
    (name) => [name, names.has(name)],
  ),
);

const targetsResult = await client.callTool({
  name: "list_browser_targets",
  arguments: { cdp_endpoint: endpoint },
});
const targets = unwrap(targetsResult);
save("mcp-list-browser-targets.json", targets);
const pages = targets?.normalized_result?.targets ?? [];
report.list_browser_targets = {
  ok: targetsResult.isError !== true,
  evidence_id: targets?.evidence_id ?? null,
  targets: pages.map((page) => ({ target_id: page.target_id, url: page.url })),
};

const target = pages.find((page) => page.origin === pageOrigin);
if (!target) {
  report.inspect_web_page = { ok: false, reason: `no page target for ${pageOrigin}` };
  console.log(JSON.stringify(report, null, 2));
  await client.close();
  process.exit(2);
}

const inspectResult = await client.callTool({
  name: "inspect_web_page",
  arguments: {
    cdp_endpoint: endpoint,
    target_id: target.target_id,
    observation_ms: 1000,
    include_accessibility_text: true,
  },
});
const inspect = unwrap(inspectResult);
save("mcp-inspect-web-page.json", inspect);
const normalized = inspect?.normalized_result ?? {};
report.inspect_web_page = {
  ok: inspectResult.isError !== true,
  evidence_id: inspect?.evidence_id ?? null,
  title: normalized.target?.title ?? null,
  url: normalized.target?.url ?? null,
  dom_nodes: normalized.dom?.total_nodes ?? null,
  accessibility_nodes: normalized.accessibility?.total_nodes ?? null,
  scripts: normalized.scripts?.total ?? null,
  completeness: normalized.completeness?.status ?? null,
};

console.log(JSON.stringify(report, null, 2));
await client.close();

const healthy =
  report.list_browser_targets.ok &&
  report.inspect_web_page.ok &&
  Object.values(report.browser_tools).every(Boolean);
process.exit(healthy ? 0 : 1);

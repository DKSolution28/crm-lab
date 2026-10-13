// MCP stdio smoke test for REA: initialize, tools/list, then list_browser_targets
// and inspect_web_page against a loopback CDP browser. Prints a non-sensitive summary.
// Usage: node scripts/rea-mcp-smoke.mjs [cdpEndpoint] [pageUrlPrefix]
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const endpoint = process.argv[2] ?? "http://127.0.0.1:9222";
const urlPrefix = process.argv[3] ?? "http://127.0.0.1:3000/";
const command = (process.env.REA_MCP_COMMAND ?? "npx -y rea-agents@6.4.0 --mcp").split(" ");

const server = spawn(command[0], command.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "";
server.stderr.on("data", (chunk) => (stderr += chunk));

const pending = new Map();
let nextId = 1;
createInterface({ input: server.stdout }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const waiter = pending.get(message.id);
  if (waiter) {
    pending.delete(message.id);
    waiter(message);
  }
});

const request = (method, params, timeoutMs = 60_000) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), timeoutMs);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    });
    server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });

const toolPayload = (result) => {
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((part) => part.type === "text")?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
};

const report = { command: command.join(" "), endpoint };
try {
  const init = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "crm-lab-smoke", version: "0.1.0" },
  });
  server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  report.server = init.serverInfo;
  report.protocolVersion = init.protocolVersion;

  const { tools } = await request("tools/list", {});
  report.toolCount = tools.length;
  const wanted = ["list_browser_targets", "inspect_web_page"];
  report.browserToolsPresent = Object.fromEntries(
    wanted.map((name) => [name, tools.some((tool) => tool.name === name)]),
  );
  report.inputSchemas = Object.fromEntries(
    wanted.map((name) => [name, Object.keys(tools.find((t) => t.name === name)?.inputSchema?.properties ?? {})]),
  );

  const listed = await request("tools/call", {
    name: "list_browser_targets",
    arguments: { cdp_endpoint: endpoint },
  });
  const listPayload = toolPayload(listed);
  const targets = (listPayload.normalized_result ?? listPayload.evidence?.normalized_result)?.targets ?? [];
  report.listBrowserTargets = {
    isError: Boolean(listed.isError),
    targets: targets.map(({ target_id, title, origin }) => ({ target_id, title, origin })),
  };

  const target = targets.find((t) => t.url?.startsWith(urlPrefix));
  if (!target) throw new Error(`no page target under ${urlPrefix}`);

  const inspected = await request(
    "tools/call",
    {
      name: "inspect_web_page",
      arguments: { cdp_endpoint: endpoint, target_id: target.target_id, include_accessibility_text: true },
    },
    120_000,
  );
  const inspectPayload = toolPayload(inspected);
  const normalized = inspectPayload.normalized_result ?? inspectPayload.evidence?.normalized_result ?? {};
  report.inspectWebPage = {
    isError: Boolean(inspected.isError),
    operation: inspectPayload.operation ?? inspectPayload.evidence?.operation,
    title: normalized.target?.title,
    origin: normalized.target?.origin,
    domNodes: normalized.dom?.total_nodes,
    completeness: normalized.completeness?.status,
    sections: Object.keys(normalized),
  };
  if (inspected.isError) report.inspectWebPage.raw = JSON.stringify(inspectPayload).slice(0, 2000);
  report.ok = !listed.isError && !inspected.isError && Boolean(normalized.dom);
} catch (error) {
  report.ok = false;
  report.error = String(error.message ?? error);
  report.stderr = stderr.slice(-2000);
} finally {
  server.kill();
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

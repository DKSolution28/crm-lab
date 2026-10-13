#!/usr/bin/env node
// Spawns `rea-agents@6.4.0 --mcp` over stdio and calls the CDP tools through MCP
// JSON-RPC, i.e. the same path an agent client uses once the server is registered.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const endpoint = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9222";
const urlHint = process.env.TARGET_URL_PREFIX ?? "http://127.0.0.1:3000";
const outDir = process.env.EVIDENCE_DIR;

const child = spawn("npx", ["--no-install", "rea-agents", "--mcp"], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const pending = new Map();
let nextId = 1;
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

const send = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`timeout ${method}`)), 60000);
    pending.set(id, (m) => {
      clearTimeout(timer);
      resolve(m);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });

const payload = (res) => {
  if (res.error) throw new Error(JSON.stringify(res.error));
  const r = res.result;
  if (r.isError) throw new Error(JSON.stringify(r.content));
  if (r.structuredContent) return r.structuredContent;
  return JSON.parse(r.content[0].text);
};

const results = {};
try {
  const init = await send("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "crm-lab-smoke", version: "1.0.0" },
  });
  results.server = init.result.serverInfo;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const tools = (await send("tools/list", {})).result.tools;
  results.toolCount = tools.length;
  for (const name of ["list_browser_targets", "inspect_web_page"]) {
    if (!tools.some((t) => t.name === name)) throw new Error(`missing tool ${name}`);
  }

  const listed = payload(
    await send("tools/call", {
      name: "list_browser_targets",
      arguments: { cdp_endpoint: endpoint },
    }),
  );
  const targets = listed.normalized_result.targets;
  results.targets = targets.map((t) => ({ type: t.type, title: t.title, origin: t.origin }));
  const target = targets.find((t) => t.url.startsWith(urlHint));
  if (!target) throw new Error(`no target starting with ${urlHint}`);

  const inspected = payload(
    await send("tools/call", {
      name: "inspect_web_page",
      arguments: { cdp_endpoint: endpoint, target_id: target.target_id, observation_ms: 500 },
    }),
  );
  const n = inspected.normalized_result;
  results.inspect = {
    operation: inspected.operation,
    confidence: inspected.confidence,
    title: n.target.title,
    origin: n.target.origin,
    domNodes: n.dom.total_nodes,
    completeness: n.completeness.status,
  };
  if (outDir) {
    writeFileSync(`${outDir}/mcp-list_browser_targets.json`, JSON.stringify(listed, null, 2));
  }
  console.log(JSON.stringify({ ok: true, ...results }, null, 2));
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: String(err), ...results }, null, 2));
  process.exitCode = 1;
} finally {
  child.kill();
}

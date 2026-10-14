// Run a small list of read-only UI actions in the authenticated Salesforce
// browser session (CDP 9223) so that REA can observe the resulting state.
//
// Usage: node scripts/sf-act.mjs '<json array of actions>'  (or a path to a JSON file)
// Actions:
//   {"goto": "/lightning/o/Account/home"}
//   {"click": {"role": "button", "name": "New"}}          role+name (exact=false by default)
//   {"click": {"text": "All Accounts"}}                   visible text
//   {"click": {"css": "button[title='Search']"}}          CSS selector
//   {"fill": {"label": "Account Name", "value": "Lab"}}   fill a labelled field (never submitted by this script)
//   {"fill": {"css": "input[placeholder*='Search']", "value": "Edge"}}
//   {"press": "Enter"}
//   {"wait": 1500}
//   {"waitFor": {"role": "dialog"}}
//   {"mask": true}                                        apply the local text redaction (see sf-redact rules)
//   {"snapshotText": {"role": "dialog"}}                  print the accessible text of a region to stdout
// Forbidden by design: no action ever clicks Save / Delete / Change Owner. A
// guard refuses clicks whose accessible name matches those labels.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const endpoint = process.env.SF_CDP_ENDPOINT ?? "http://127.0.0.1:9223";
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/sf-act.mjs '<json actions>' | actions.json");
  process.exit(2);
}
const actions = JSON.parse(arg.trim().startsWith("[") ? arg : readFileSync(arg, "utf8"));

const forbidden = /^(save|save\s*&\s*new|delete|change owner|submit|confirm delete|merge|next)$/i;
const redactionFile = process.env.SF_REDACTION_FILE ?? "/tmp/sf-explore/redaction.json";
let redaction = { replacements: [] };
try {
  redaction = JSON.parse(readFileSync(redactionFile, "utf8"));
} catch {
  // No redaction file yet: masking is a no-op.
}

const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const page = context.pages().find((p) => /lightning\.force\.com|my\.salesforce\.com|salesforce-setup\.com/.test(p.url()));
if (!page) {
  console.error("No Lightning page in the session; open the org first.");
  await browser.close();
  process.exit(3);
}

const locate = (spec) => {
  if (spec.css) return page.locator(spec.css).first();
  if (spec.role) return page.getByRole(spec.role, { name: spec.name, exact: spec.exact ?? false }).first();
  if (spec.label) return page.getByLabel(spec.label, { exact: spec.exact ?? false }).first();
  if (spec.text) return page.getByText(spec.text, { exact: spec.exact ?? false }).first();
  throw new Error(`Unsupported locator ${JSON.stringify(spec)}`);
};

const applyMask = async () => {
  await page.evaluate((rules) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue;
      for (const [pattern, flags, replacement] of rules) {
        text = text.replace(new RegExp(pattern, flags), replacement);
      }
      if (text !== node.nodeValue) node.nodeValue = text;
    }
    for (const el of document.querySelectorAll("[title],[aria-label],[alt],[placeholder]")) {
      for (const attr of ["title", "aria-label", "alt", "placeholder"]) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        let next = value;
        for (const [pattern, flags, replacement] of rules) next = next.replace(new RegExp(pattern, flags), replacement);
        if (next !== value) el.setAttribute(attr, next);
      }
    }
    for (const input of document.querySelectorAll("input,textarea")) {
      let next = input.value;
      for (const [pattern, flags, replacement] of rules) next = next.replace(new RegExp(pattern, flags), replacement);
      if (next !== input.value) input.value = next;
    }
  }, redaction.replacements);
};

const log = [];
for (const action of actions) {
  if (action.goto) {
    const url = /^https?:/.test(action.goto) ? action.goto : new URL(action.goto, new URL(page.url()).origin).toString();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    log.push({ goto: action.goto, ok: true });
  } else if (action.click) {
    const target = locate(action.click);
    const name = ((await target.getAttribute("aria-label").catch(() => null)) ?? (await target.innerText().catch(() => "")) ?? "").trim();
    if (forbidden.test(name) || forbidden.test(action.click.name ?? "")) {
      log.push({ click: action.click, refused: "destructive-or-saving action" });
      continue;
    }
    await target.waitFor({ state: "visible", timeout: action.click.timeout ?? 20_000 });
    await target.click({ timeout: 20_000 });
    log.push({ click: action.click, ok: true });
  } else if (action.fill) {
    const target = locate(action.fill);
    await target.waitFor({ state: "visible", timeout: 20_000 });
    await target.fill(action.fill.value);
    log.push({ fill: { ...action.fill, value: "<set>" }, ok: true });
  } else if (action.press) {
    await page.keyboard.press(action.press);
    log.push({ press: action.press, ok: true });
  } else if (action.wait) {
    await page.waitForTimeout(action.wait);
    log.push({ wait: action.wait });
  } else if (action.waitFor) {
    await locate(action.waitFor).waitFor({ state: "visible", timeout: action.waitFor.timeout ?? 30_000 });
    log.push({ waitFor: action.waitFor, ok: true });
  } else if (action.mask) {
    await applyMask();
    log.push({ mask: true, rules: redaction.replacements.length });
  } else if (action.options) {
    const target = locate(action.options);
    await target.waitFor({ state: "visible", timeout: 20_000 });
    const options = await target.evaluate((el) => {
      const select = el.tagName === "SELECT" ? el : el.querySelector("select");
      if (select) return [...select.options].map((o) => o.textContent.trim());
      const listId = el.getAttribute("aria-controls") || el.getAttribute("aria-owns");
      const list = listId ? document.getElementById(listId) : null;
      return list ? [...list.querySelectorAll("[role=option]")].map((o) => o.textContent.trim()) : null;
    });
    log.push({ options: action.options, values: options });
  } else if (action.framesText) {
    const texts = [];
    for (const frame of page.frames()) {
      const text = await frame.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      if (text.trim()) texts.push({ url: frame.url().replace(/^(https?:\/\/)[^.]+\./, "$1<mydomain>.").split("?")[0], text });
    }
    log.push({ framesText: true, frames: texts });
  } else if (action.snapshotText) {
    const text = await locate(action.snapshotText).innerText({ timeout: 20_000 });
    log.push({ snapshotText: action.snapshotText, text });
  } else {
    log.push({ unknown: action });
  }
}

const landed = new URL(page.url());
console.log(
  JSON.stringify(
    {
      title: await page.title(),
      path: `${landed.pathname}${landed.search}`,
      actions: log,
    },
    null,
    2,
  ),
);
await browser.close();

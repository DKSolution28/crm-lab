// Navigate the already-authenticated Salesforce browser session (CDP 9223) to a
// Lightning path, then print the resulting target so REA can observe it.
// Usage: node scripts/sf-navigate.mjs /lightning/o/Account/list?filterName=Recent
// The session must have been opened and authenticated by a person first; this
// script never fills a login form and never prints cookies or tokens.
import { chromium } from "playwright";

const endpoint = process.env.SF_CDP_ENDPOINT ?? "http://127.0.0.1:9223";
const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/sf-navigate.mjs <absolute URL or /lightning/... path>");
  process.exit(2);
}

const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const page = context?.pages().find((p) => /salesforce\.com|force\.com/.test(p.url())) ?? context?.pages()[0];
if (!page) {
  console.error("No page found in the Salesforce browser session.");
  await browser.close();
  process.exit(1);
}

const current = new URL(page.url());
const loginHost = /(^|\.)login\.salesforce\.com$|(^|\.)test\.salesforce\.com$/.test(current.host);
let destination;
if (/^https?:\/\//.test(target)) {
  destination = target;
} else if (loginHost) {
  console.error(`Current page is ${current.host}: open the org first (Environment Switcher or MFA pending).`);
  await browser.close();
  process.exit(3);
} else {
  destination = new URL(target, current.origin).toString();
}

await page.goto(destination, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(Number(process.env.SF_SETTLE_MS ?? 2500));

const session = await context.newCDPSession(page);
const { targetInfo } = await session.send("Target.getTargetInfo");
const landed = new URL(page.url());
const redactedHost = landed.host.replace(/^[^.]+/, "<mydomain>");
console.log(
  JSON.stringify(
    {
      target_id: targetInfo.targetId,
      title: await page.title(),
      origin: landed.origin,
      path: `${landed.pathname}${landed.search}`,
      redacted_url: `${landed.protocol}//${redactedHost}${landed.pathname}${landed.search}`,
    },
    null,
    2,
  ),
);
await browser.close();

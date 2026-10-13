// Verifies that Playwright can launch the installed Chromium and drive a page.
// Prints a JSON summary; exits non-zero on failure. Used by verify.sh.
import { chromium } from "playwright";

const summary = { ok: false, executablePath: chromium.executablePath() };
let browser;
try {
  browser = await chromium.launch({ headless: true });
  summary.browserVersion = browser.version();
  const page = await browser.newPage();
  await page.setContent("<title>crm-lab playwright check</title><h1 id='h'>Playwright OK</h1>");
  summary.pageTitle = await page.title();
  summary.heading = await page.locator("#h").innerText();
  summary.ok = summary.pageTitle === "crm-lab playwright check" && summary.heading === "Playwright OK";
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
} finally {
  await browser?.close();
}

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);

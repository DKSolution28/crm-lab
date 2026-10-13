// Vérifie que Chromium (installé par Playwright) se lance réellement :
// headless shell (défaut) et Chromium complet (channel "chromium"),
// exécute du JS dans une page et enregistre une capture d'écran.
import { chromium } from "playwright";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "reports/env-verification";
mkdirSync(outDir, { recursive: true });

const html = `<!doctype html><title>chromium-check</title>
<h1 id="t">chromium ok</h1><script>document.getElementById('t').dataset.js = String(6 * 7)</script>`;

const results = [];
for (const [label, options] of [
  ["headless-shell", {}],
  ["chromium-full", { channel: "chromium" }],
]) {
  const entry = { label, ok: false };
  try {
    if (options.channel) entry.executablePath = chromium.executablePath();
    const browser = await chromium.launch(options);
    entry.version = browser.version();
    const page = await browser.newPage();
    await page.setContent(html);
    entry.title = await page.title();
    entry.jsResult = await page.locator("#t").getAttribute("data-js");
    entry.userAgent = await page.evaluate(() => navigator.userAgent);
    const screenshot = join(outDir, `chromium-${label}.png`);
    await page.screenshot({ path: screenshot });
    entry.screenshotBytes = statSync(screenshot).size;
    await browser.close();
    entry.ok = entry.title === "chromium-check" && entry.jsResult === "42" && entry.screenshotBytes > 0;
  } catch (error) {
    entry.error = error instanceof Error ? error.message.split("\n")[0] : String(error);
  }
  results.push(entry);
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);

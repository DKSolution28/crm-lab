// Launch Playwright's Chromium, render a page, and optionally load a URL.
// Usage: node scripts/check-playwright.mjs [url] [screenshot.png]
import { chromium } from "playwright";

const [url, screenshotPath] = process.argv.slice(2);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent("<h1 id='probe'>playwright-ok</h1>");
  const probe = await page.textContent("#probe");
  if (probe !== "playwright-ok") throw new Error(`unexpected probe text: ${probe}`);

  const result = {
    executablePath: chromium.executablePath(),
    browserVersion: browser.version(),
    probe,
  };

  if (url) {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    result.url = url;
    result.status = response?.status() ?? null;
    result.title = await page.title();
    result.h1 = (await page.locator("h1").first().textContent())?.trim() ?? null;
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
    }
    if (result.status !== 200) throw new Error(`HTTP ${result.status} for ${url}`);
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}

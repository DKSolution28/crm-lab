import { chromium } from "playwright";

async function verifyChromium() {
  console.log("Launching Chromium in headless mode via Playwright...");
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head><title>Playwright Verification</title></head>
      <body>
        <h1>Chromium is functional</h1>
        <p id="desc">Salesforce reverse engineering environment verified</p>
      </body>
    </html>
  `);

  const title = await page.title();
  const text = await page.locator("#desc").textContent();
  const browserVersion = browser.version();

  console.log(`Browser version: ${browserVersion}`);
  console.log(`Page title: ${title}`);
  console.log(`Page content: ${text}`);

  await page.screenshot({ path: "scripts/verification-playwright.png" });
  console.log("Screenshot saved to scripts/verification-playwright.png");

  await browser.close();
  console.log("Browser closed successfully.");
}

verifyChromium().catch((err) => {
  console.error("Chromium verification failed:", err);
  process.exit(1);
});

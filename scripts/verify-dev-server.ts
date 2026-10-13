import { chromium } from "playwright";

async function verifyDevServer() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000");

  const title = await page.title();
  const heading = await page.locator("h1").textContent();
  console.log(`Page Title: ${title}`);
  console.log(`Main Heading: ${heading}`);

  await page.screenshot({ path: "scripts/dev-server-preview.png", fullPage: true });
  console.log("Dev server screenshot captured: scripts/dev-server-preview.png");
  await browser.close();
}

verifyDevServer().catch((err) => {
  console.error(err);
  process.exit(1);
});

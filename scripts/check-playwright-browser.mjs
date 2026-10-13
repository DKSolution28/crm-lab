import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent("<title>crm-lab</title><h1>chromium-ok</h1>");
const title = await page.title();
const heading = await page.locator("h1").textContent();
const report = {
  executablePath: chromium.executablePath(),
  version: browser.version(),
  title,
  heading,
};
console.log(JSON.stringify(report));
await browser.close();

if (title !== "crm-lab" || heading !== "chromium-ok") {
  process.exit(1);
}

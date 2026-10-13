import { test, expect } from "@playwright/test";

test("environment verification test", async ({ page }) => {
  await page.setContent("<h1>Chromium & Playwright Working</h1>");
  await expect(page.locator("h1")).toHaveText("Chromium & Playwright Working");
});

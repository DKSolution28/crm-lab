import { test, expect } from "@playwright/test";

// Test de fumee hors-ligne : prouve que Chromium est pilotable via Playwright
// sans dependre d'un serveur ni d'un acces reseau externe.
test("chromium headless charge une page et execute du JS", async ({ page }) => {
  await page.goto("data:text/html,<title>Labo RE</title><h1>Bonjour</h1>");
  await expect(page).toHaveTitle("Labo RE");
  const texte = await page.textContent("h1");
  expect(texte).toBe("Bonjour");
});

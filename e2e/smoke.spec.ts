import { expect, test } from "@playwright/test";

test("health endpoint reports a reachable database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.database.ok).toBe(true);
});

test("dashboard renders statistics from PostgreSQL", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/CRM Lab/);
  const stats = page.getByTestId("dashboard-stats");
  await expect(stats).toBeVisible();
  await expect(page.getByTestId("stat-comptes")).toHaveText(/^\d+$/);
});

test("an account can be created and appears in the list", async ({ page }) => {
  const name = `Playwright Account ${Date.now()}`;
  await page.goto("/accounts");
  const form = page.getByTestId("new-account-form");
  await form.getByLabel("Nom *").fill(name);
  await form.getByLabel("Secteur").fill("Testing");
  await form.getByLabel("Ville").fill("Lyon");
  await form.getByRole("button", { name: "Créer le compte" }).click();

  await expect(page.getByTestId("create-success")).toBeVisible();
  await expect(page.getByTestId("accounts-table").getByRole("row", { name: new RegExp(name) })).toBeVisible();
});

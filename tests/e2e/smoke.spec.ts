import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Reverse engineering fonctionnel");
});

test("l'API de santé joint PostgreSQL via Prisma", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok", database: "up" });
});

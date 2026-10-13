import { expect, test } from "@playwright/test";

test("health endpoint reports a reachable database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", database: "up" });
});

test("home page lists seeded demo accounts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Reconstruction fonctionnelle",
  );
  await expect(page.getByText("Acme Demo Corp")).toBeVisible();
});

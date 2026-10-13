import { expect, test } from "@playwright/test";

test("renders the authorized CRM lab", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Reverse engineering fonctionnel, traçable et autorisé.",
    }),
  ).toBeVisible();
  await expect(page.getByText("REA 6.4.0")).toBeVisible();
});

test("reports the development service as healthy", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    service: "crm-lab",
    status: "ok",
  });
});

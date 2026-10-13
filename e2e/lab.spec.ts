import { expect, test } from "@playwright/test";

test("records a lab note in the local application", async ({ page }) => {
  const title = `Observation ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByText("PostgreSQL joignable")).toBeVisible();
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Détail").fill("Note créée pendant la vérification locale.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

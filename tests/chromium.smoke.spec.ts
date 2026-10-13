import { expect, test } from "@playwright/test";

test("Chromium can open a blank page", async ({ page }) => {
  await page.goto("about:blank");
  expect(page.url()).toBe("about:blank");
});

test("lab home renders and can store a Prisma note", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Salesforce/i })).toBeVisible();

  const stamp = `note-${Date.now()}`;
  await page.getByLabel("Observation").fill(stamp);
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByTestId("note-status")).toContainText("Note enregistrée");
  await expect(page.getByTestId("lab-note").first()).toContainText(stamp);
});

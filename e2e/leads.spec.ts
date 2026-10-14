import { expect, test } from "@playwright/test";
import { cleanupE2eRecords } from "./helpers/db";

const PREFIX = "[e2e] QA ";
const stamp = Date.now();
const lastName = `${PREFIX}Voss ${stamp}`;
const company = `${PREFIX}Paper Lantern ${stamp}`;
const leadName = `Maren ${lastName}`;

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await cleanupE2eRecords(PREFIX);
});

test.describe("Leads module", () => {
  test("creates a fictional lead, qualifies it, and finds it in search", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.locator("[aria-disabled='true']", { hasText: "Contacts" })).toBeVisible();
    await expect(nav.locator("[aria-disabled='true']", { hasText: "Opportunities" })).toBeVisible();
    await nav.getByRole("link", { name: "Leads" }).click();
    await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "All leads" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My leads" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Recently viewed" })).toBeVisible();

    await page.getByRole("link", { name: "New", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New Lead" })).toBeVisible();
    await page.getByLabel("First Name").fill("Maren");
    await page.getByLabel("Last Name").fill(lastName);
    await page.getByLabel("Company").fill(company);
    await page.getByLabel("Email").fill(`maren.${stamp}@paper-lantern.example`);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(/\/leads\/[a-z0-9]+/);
    await expect(page.getByTestId("lead-name")).toHaveText(leadName);
    await expect(page.getByTestId("lead-status")).toHaveText("New");
    await expect(page.getByTestId("lead-qualified")).toHaveText("No");
    await expect(page.getByRole("button", { name: /convert/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /convert/i })).toHaveCount(0);

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("dialog", { name: `Edit ${leadName}` })).toBeVisible();
    await page.getByLabel("Status").selectOption("Working");
    await page.getByRole("checkbox", { name: "Qualified" }).check();
    await expect(page.getByRole("checkbox", { name: "Qualified" })).toBeChecked();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByTestId("lead-name")).toHaveText(leadName);
    await expect(page.getByTestId("lead-status")).toHaveText("Working");
    await expect(page.getByTestId("lead-qualified")).toHaveText("Yes");
    await expect(page.getByRole("button", { name: /convert/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /convert/i })).toHaveCount(0);

    await page.goto("/leads");
    await page.getByPlaceholder("Search this list...").fill(`Paper Lantern ${stamp}`);
    await page.getByPlaceholder("Search this list...").press("Enter");
    await expect(page).toHaveURL(/q=Paper/);
    await expect(page.getByRole("status").filter({ hasText: "1 item" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Leads" }).getByRole("link", { name: leadName, exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Leads" })).toContainText("Working");
    await expect(page.getByRole("table", { name: "Leads" })).toContainText("Yes");

    await page.getByPlaceholder("Search this list...").fill(`zzzz-no-lead-${stamp}`);
    await page.getByPlaceholder("Search this list...").press("Enter");
    await expect(page.getByRole("heading", { name: "No items to display." })).toBeVisible();

    await page.goto("/leads/missing-lead");
    await expect(page.getByRole("heading", { name: "This lead does not exist or was deleted." })).toBeVisible();
  });
});

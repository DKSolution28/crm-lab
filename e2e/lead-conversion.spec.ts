import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../tests/test-database";

const PREFIX = "[e2e] ";
const stamp = Date.now();
const lastName = `${PREFIX}Lovelace ${stamp}`;
const company = `${PREFIX}Analytical Engines ${stamp}`;
const leadName = `Ada ${lastName}`;

test.describe.configure({ mode: "serial", timeout: 90_000 });

let database: PrismaClient | null = null;

const qaDatabase = async () => {
  if (!database) {
    database = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
    await assertConnectedTestDatabase(async () => {
      const rows = await database!.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    });
  }
  return database;
};

test.afterAll(async () => {
  const prefix = assertCleanupPrefix(PREFIX);
  const db = await qaDatabase();
  const currentDatabase = async () => {
    const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    return rows[0]?.name ?? "";
  };
  await assertConnectedTestDatabase(currentDatabase);
  await db.opportunity.deleteMany({
    where: {
      OR: [{ name: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }, { primaryContact: { lastName: { startsWith: prefix } } }],
    },
  });
  await assertConnectedTestDatabase(currentDatabase);
  await db.contact.deleteMany({ where: { lastName: { startsWith: prefix } } });
  await assertConnectedTestDatabase(currentDatabase);
  await db.lead.deleteMany({ where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }] } });
  await assertConnectedTestDatabase(currentDatabase);
  await db.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await db.$disconnect();
  database = null;
});

const openLead = async (page: Page) => {
  await page.goto("/leads");
  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "New Lead" })).toBeVisible();
  await page.getByLabel("First Name").fill("Ada");
  await page.getByLabel("Last Name").fill(lastName);
  await page.getByLabel("Company").fill(company);
  await page.getByLabel("Title").fill("Analyst");
  await page.getByLabel("Email").fill(`ada.${stamp}@analytical.example`);
  await page.getByLabel("Phone").fill("+1 555 0142");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\/[a-z0-9]+/);
  await expect(page.getByTestId("lead-name")).toHaveText(leadName);
};

test.describe("Lead conversion", () => {
  test("creates a fictional lead, qualifies it, converts it, and refuses a second conversion", async ({ page }) => {
    await openLead(page);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("dialog", { name: `Edit ${leadName}` })).toBeVisible();
    await page.getByLabel("Status").selectOption("Working");
    await page.getByRole("checkbox", { name: "Qualified" }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("lead-status")).toHaveText("Working");
    await expect(page.getByTestId("lead-qualified")).toHaveText("Yes");

    await page.getByTestId("convert-lead").click();
    await expect(page.getByRole("dialog", { name: "Convert lead" })).toBeVisible();
    await expect(page.getByLabel("Account Name")).toHaveValue(company);
    await page.getByRole("button", { name: "Convert lead" }).click();

    await expect(page.getByTestId("lead-status")).toHaveText("Converted");
    await expect(page.getByTestId("convert-lead")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    const leadUrl = page.url().split("?")[0];
    await page.screenshot({ path: "/opt/cursor/artifacts/lead-converted.png", fullPage: true });

    await page.getByTestId("converted-account").click();
    await expect(page).toHaveURL(/\/accounts\/[a-z0-9]+/);
    await expect(page.getByTestId("account-name")).toHaveText(company);
    await page.screenshot({ path: "/opt/cursor/artifacts/converted-account.png", fullPage: true });

    await page.goto(leadUrl);
    await page.getByTestId("converted-contact").click();
    await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+/);
    await expect(page.getByTestId("contact-name")).toHaveText(leadName);

    const leadId = leadUrl.split("/").pop() ?? "";
    const again = await page.request.post(`/api/leads/${leadId}/convert`, {
      data: {
        createOpportunity: true,
        accountName: `${PREFIX}Duplicate ${stamp}`,
        opportunity: { name: `${PREFIX}Duplicate Deal ${stamp}`, amount: "10.00", closeDate: "2026-12-31", stage: "Qualification" },
      },
    });
    expect(again.status()).toBe(409);
    const payload = (await again.json()) as { error: string };
    expect(payload.error).toBe("This lead is already converted.");

    await page.goto(`/leads/${leadId}/edit`);
    await expect(page.getByRole("heading", { name: "This lead is already converted." })).toBeVisible();

    const db = await qaDatabase();
    expect(await db.account.count({ where: { name: company } })).toBe(1);
    expect(await db.account.count({ where: { name: `${PREFIX}Duplicate ${stamp}` } })).toBe(0);
    expect(await db.contact.count({ where: { lastName } })).toBe(1);
    expect(await db.opportunity.count({ where: { name: { startsWith: `${PREFIX}Duplicate` } } })).toBe(0);
    const contact = await db.contact.findFirst({ where: { lastName } });
    expect(contact?.firstName).toBe("Ada");
    expect(contact?.title).toBe("Analyst");
    expect(contact?.email).toBe(`ada.${stamp}@analytical.example`);
  });
});

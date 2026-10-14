import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../tests/test-database";

const PREFIX = "[e2e] QA ";
const stamp = Date.now();
const accountName = `${PREFIX}Account ${stamp}`;
const contactLastName = `${PREFIX}Contact ${stamp}`;

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
  await db.contact.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }] },
  });
  await assertConnectedTestDatabase(currentDatabase);
  await db.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await db.$disconnect();
  database = null;
});

const asDemoStandard = async (page: Page) => {
  await page.goto("/");
  const userSelect = page.getByLabel("Current demo user");
  await userSelect.selectOption({ label: "Demo Standard (standard)" });
  await expect(userSelect.locator("option:checked")).toHaveText("Demo Standard (standard)");
};

test.describe("Parcours 1 — account, contact, association", () => {
  let accountUrl: string;
  let contactUrl: string;

  test("creates an account and a contact associated to it", async ({ page }) => {
    await asDemoStandard(page);
    await page.goto("/accounts/new");
    await expect(page.getByRole("dialog", { name: "New Account" })).toBeVisible();
    await expect(page.getByText("Demo Standard (demostd)")).toBeVisible();
    await page.locator("#field-name").fill(accountName);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/accounts\/[a-z0-9]+/);
    await expect(page.getByTestId("account-name")).toHaveText(accountName);
    accountUrl = page.url().split("?")[0];

    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contacts" }).click();
    await expect(page).toHaveURL(/\/contacts/);
    await page.getByRole("link", { name: "New", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New Contact" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Complete this field.")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "New Contact" })).toBeVisible();

    await page.locator("#field-lastName").fill(contactLastName);
    const accountLookup = page.getByRole("combobox", { name: "Account Name" });
    await accountLookup.fill(accountName);
    await page.getByRole("listbox").getByRole("button", { name: accountName, exact: true }).click();
    await expect(page.getByLabel("Clear Account Name")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(/\/contacts\/[a-z0-9]+/);
    await expect(page.getByRole("status").filter({ hasText: "was created." })).toBeVisible();
    await expect(page.getByTestId("contact-name")).toHaveText(contactLastName);
    await expect(page.getByTestId("contact-account")).toHaveText(accountName);
    contactUrl = page.url().split("?")[0];
  });

  test("finds that single contact from the list search", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByPlaceholder("Search this list...").fill(contactLastName);
    await page.getByPlaceholder("Search this list...").press("Enter");
    await expect(page).toHaveURL(/q=/);
    await expect(page.getByRole("status").filter({ hasText: "1 item" })).toBeVisible();
    const table = page.getByRole("table", { name: "Contacts" });
    await expect(table.getByRole("link", { name: contactLastName, exact: true })).toBeVisible();
    await expect(table.getByRole("link", { name: accountName, exact: true })).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(2);
    const lookup = await page.request.get(`/api/contacts/lookup?q=${encodeURIComponent(contactLastName)}`);
    expect(lookup.status()).toBe(200);
    const lookupBody = (await lookup.json()) as { items: Array<{ id: string; lastName: string }> };
    expect(lookupBody.items).toHaveLength(1);
    expect(lookupBody.items[0]?.lastName).toBe(contactLastName);
  });

  test("edits the title to QA Buyer without dropping the account", async ({ page }) => {
    await page.goto(contactUrl);
    await page.getByRole("link", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: `Edit ${contactLastName}` })).toBeVisible();
    await expect(page.locator("#field-lastName")).toHaveValue(contactLastName);
    await expect(page.getByText(accountName, { exact: true })).toBeVisible();
    await page.locator("#field-title").fill("QA Buyer");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${contactUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    await expect(page.getByRole("status").filter({ hasText: "was saved." })).toBeVisible();
    await expect(page.getByTestId("contact-name")).toHaveText(contactLastName);
    await expect(page.getByRole("definition").filter({ hasText: "QA Buyer" }).first()).toBeVisible();
    await expect(page.getByTestId("contact-account")).toHaveText(accountName);
  });

  test("shows the relation on both records and stores one row", async ({ page }) => {
    await page.goto(`${accountUrl}?tab=related`);
    await expect(page.getByRole("heading", { name: /Contacts \(1\)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: contactLastName, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "QA Buyer" })).toBeVisible();
    await page.getByRole("link", { name: contactLastName, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${contactUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    await expect(page.getByTestId("contact-name")).toHaveText(contactLastName);
    await page.getByTestId("contact-account").click();
    await expect(page).toHaveURL(new RegExp(`${accountUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    await expect(page.getByTestId("account-name")).toHaveText(accountName);

    const db = await qaDatabase();
    await assertConnectedTestDatabase(async () => {
      const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    });
    const accounts = await db.account.findMany({ where: { name: accountName }, select: { id: true, ownerId: true } });
    const contacts = await db.contact.findMany({ where: { lastName: contactLastName }, select: { accountId: true, title: true, ownerId: true } });
    const owner = await db.user.findUniqueOrThrow({ where: { alias: "demostd" }, select: { id: true } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.ownerId).toBe(owner.id);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.accountId).toBe(accounts[0]?.id);
    expect(contacts[0]?.title).toBe("QA Buyer");
    expect(contacts[0]?.ownerId).toBe(owner.id);
  });
});

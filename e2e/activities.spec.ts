import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../tests/test-database";

const PREFIX = "[e2e] QA Task ";
const stamp = Date.now();
const accountName = `${PREFIX}Parent ${stamp}`;
const subject = `${PREFIX}${stamp}`;

test.describe.configure({ mode: "serial", timeout: 120_000 });

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
  await db.task.deleteMany({ where: { subject: { startsWith: prefix } } });
  await assertConnectedTestDatabase(currentDatabase);
  await db.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await db.$disconnect();
  database = null;
});

test.describe("Parcours 4 — task on the account, status, history", () => {
  test("creates a task from the account page, completes it, and shows it in the history", async ({ page }) => {
    const created = await page.request.post("/api/accounts", {
      data: { name: accountName },
      headers: { "x-crm-lab-user": "demoadm" },
    });
    expect(created.status()).toBe(201);
    const account = (await created.json()) as { id: string; name: string };
    expect(account.name).toBe(accountName);

    await page.goto(`/accounts/${account.id}?tab=related`);
    await expect(page.getByRole("heading", { name: /Opportunities \(0\)/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Contacts \(0\)/ })).toBeVisible();
    const form = page.locator("#related-tasks form[data-hydrated='true']");
    await expect(form).toBeVisible();

    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Due Date").fill("2026-12-31");
    await page.getByLabel("Priority").selectOption("High");
    await page.getByLabel("Assigned To").selectOption({ label: "Demo Standard (demostd)" });
    await page.getByRole("button", { name: "Save Task" }).click();

    await expect(page.getByRole("status").filter({ hasText: "was created." })).toBeVisible();
    await expect(page).toHaveURL(/tab=related/);
    const open = page.getByTestId("open-activities");
    await expect(open.getByRole("heading", { name: /Open Activities \(1\)/ })).toBeVisible();
    await expect(open).toContainText(subject);
    await expect(open).toContainText("High");
    await expect(open).toContainText("Demo Standard (demostd)");
    await expect(open).toContainText("Dec 31, 2026");

    await expect(page.locator("#related-tasks form[data-hydrated='true']")).toBeVisible();
    await page.getByLabel(`Status for ${subject}`).selectOption("Completed");
    await page.getByRole("button", { name: `Update status for ${subject}` }).click();

    await expect(page.getByRole("status").filter({ hasText: "was saved." })).toBeVisible();
    const history = page.getByTestId("activity-history");
    await expect(history.getByRole("heading", { name: /Activity History \(1\)/ })).toBeVisible();
    await expect(history).toContainText(subject);
    await expect(history).toContainText("Completed");
    await expect(history).toContainText("High");
    await expect(history).toContainText("Demo Standard (demostd)");
    await expect(open).not.toContainText(subject);
    await expect(open.getByRole("heading", { name: /Open Activities \(0\)/ })).toBeVisible();

    const db = await qaDatabase();
    await assertConnectedTestDatabase(async () => {
      const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    });
    const tasks = await db.task.findMany({ where: { subject } });
    const owner = await db.user.findUniqueOrThrow({ where: { alias: "demoadm" }, select: { id: true } });
    const assignee = await db.user.findUniqueOrThrow({ where: { alias: "demostd" }, select: { id: true } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.accountId).toBe(account.id);
    expect(tasks[0]?.contactId).toBeNull();
    expect(tasks[0]?.leadId).toBeNull();
    expect(tasks[0]?.opportunityId).toBeNull();
    expect(tasks[0]?.status).toBe("Completed");
    expect(tasks[0]?.priority).toBe("High");
    expect(tasks[0]?.assigneeId).toBe(assignee.id);
    expect(tasks[0]?.ownerId).toBe(owner.id);
    expect(tasks[0]?.dueDate?.toISOString().slice(0, 10)).toBe("2026-12-31");
    expect(tasks[0]?.completedAt).toBeTruthy();
  });
});

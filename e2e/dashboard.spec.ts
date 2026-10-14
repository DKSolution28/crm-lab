import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../tests/test-database";

const PREFIX = "[e2e] Dash ";
const stamp = Date.now();
const EXACT = "9007199254740993.01";
const accountName = `${PREFIX}Pipe Account ${stamp}`;
const opportunityName = `${PREFIX}Pipe ${stamp}`;

test.describe.configure({ mode: "serial" });

const cleanup = async () => {
  const scoped = assertCleanupPrefix(PREFIX);
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  try {
    const readName = async () => {
      const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    };
    await assertConnectedTestDatabase(readName);
    await db.task.deleteMany({ where: { subject: { startsWith: scoped } } });
    await db.opportunity.deleteMany({
      where: { OR: [{ name: { startsWith: scoped } }, { account: { name: { startsWith: scoped } } }] },
    });
    await db.account.deleteMany({ where: { name: { startsWith: scoped } } });
  } finally {
    await db.$disconnect();
  }
};

const insertTasks = async () => {
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  try {
    const readName = async () => {
      const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    };
    await assertConnectedTestDatabase(readName);
    const account = await db.account.findFirstOrThrow({ where: { name: accountName } });
    const createTask = async (subject: string, status: "NotStarted" | "Completed") =>
      db.task.create({
        data: {
          subject: `${PREFIX}${subject} ${stamp}`,
          status,
          priority: "Normal",
          completedAt: status === "Completed" ? new Date() : null,
          assigneeId: account.ownerId,
          ownerId: account.ownerId,
          createdById: account.createdById,
          lastModifiedById: account.lastModifiedById,
          accountId: account.id,
        },
      });
    const overdue = await createTask("overdue", "NotStarted");
    const today = await createTask("today", "NotStarted");
    const completed = await createTask("completed", "Completed");
    await createTask("undated", "NotStarted");
    await db.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
      WHERE "id" = ${overdue.id}
    `;
    await db.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      WHERE "id" = ${today.id}
    `;
    await db.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
      WHERE "id" = ${completed.id}
    `;
  } finally {
    await db.$disconnect();
  }
};

test.beforeAll(async () => {
  await cleanup();
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  try {
    const readName = async () => {
      const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
      return rows[0]?.name ?? "";
    };
    await assertConnectedTestDatabase(readName);
    await db.user.upsert({
      where: { alias: "demoadm" },
      update: {},
      create: { alias: "demoadm", firstName: "Demo", lastName: "Admin", role: "ADMIN" },
    });
  } finally {
    await db.$disconnect();
  }
});
test.afterAll(cleanup);

test("creates an opportunity, moves its stage, and shows that amount on the dashboard", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/accounts/new");
  await expect(page.getByRole("dialog", { name: "New Account" })).toBeVisible();
  await page.locator("#field-name").fill(accountName);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("account-name")).toHaveText(accountName);

  await page.goto("/opportunities/new");
  await expect(page.getByRole("dialog", { name: "New Opportunity" })).toBeVisible();
  await page.locator("#field-name").fill(opportunityName);
  const accountLookup = page.locator("#account-lookup");
  await accountLookup.fill(accountName);
  await page.getByRole("option", { name: accountName }).click();
  await page.locator("#field-stageName").selectOption("Qualification");
  await page.locator("#field-amount").fill(EXACT);
  await page.locator("#field-closeDate").fill("2026-12-31");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page).toHaveURL(/\/opportunities\/[a-z0-9]+/);
  await expect(page.getByTestId("opportunity-amount")).toHaveText(EXACT);
  await expect(page.getByTestId("opportunity-close-date")).toHaveText("2026-12-31");
  await expect(page.getByTestId("opportunity-stage")).toHaveText("Qualification");

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("dialog", { name: `Edit ${opportunityName}` })).toBeVisible();
  await page.locator("#field-stageName").selectOption("Proposal");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("opportunity-stage")).toHaveText("Proposal");
  await expect(page.getByTestId("opportunity-amount")).toHaveText(EXACT);

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Accounts" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Leads" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Contacts" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Opportunities" })).toBeVisible();
  await nav.getByRole("link", { name: "Dashboard" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("dashboard-stage-Proposal")).toBeVisible();
  await expect(page.getByTestId("dashboard-stage-amount-Proposal")).toHaveText(EXACT);
  await expect(page.getByTestId("dashboard-stage-count-Proposal")).toHaveText("1");
  await expect(page.getByTestId("dashboard-pipeline-amount")).toHaveText(EXACT);
  await expect(page.getByTestId("dashboard-pipeline-amount")).not.toHaveText(String(Number(EXACT)));
  await expect(page.getByTestId("dashboard-stage-amount-Qualification")).toHaveText("0.00");
  await expect(page.getByTestId("dashboard-stage-amount-Negotiation")).toHaveText("0.00");
  await expect(page.getByTestId("dashboard-stage-amount-ClosedWon")).toHaveText("0.00");
  await expect(page.getByTestId("dashboard-stage-amount-ClosedLost")).toHaveText("0.00");
  await expect(page.getByTestId("dashboard-overdue-tasks")).toHaveText("0");

  const body = await (await page.request.get("/api/dashboard")).json();
  expect(body.pipelineAmount).toBe(EXACT);
  expect(body.opportunitiesByStage.find((row: { stage: string }) => row.stage === "Proposal").amount).toBe(EXACT);
  expect(body.overdueTasks).toBe(0);

  await insertTasks();
  await page.reload();
  await expect(page.getByTestId("dashboard-overdue-tasks")).toHaveText("1");
  await expect(page.getByTestId("dashboard-pipeline-amount")).toHaveText(EXACT);
  await expect(page.getByTestId("dashboard-stage-amount-Proposal")).toHaveText(EXACT);

  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
});

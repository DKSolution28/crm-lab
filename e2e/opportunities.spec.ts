import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../tests/test-database";

const PREFIX = "[e2e] QA ";
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
    await db.opportunity.deleteMany({
      where: { OR: [{ name: { startsWith: scoped } }, { account: { name: { startsWith: scoped } } }] },
    });
    await db.account.deleteMany({ where: { name: { startsWith: scoped } } });
  } finally {
    await db.$disconnect();
  }
};

test.beforeAll(cleanup);
test.afterAll(cleanup);

test("creates an opportunity with a decimal amount and keeps that total on the board after a stage change", async ({ page }) => {
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

  await expect(page).toHaveURL(/\/opportunities\/[a-z0-9]+\?toast=/);
  await expect(page.getByTestId("opportunity-name")).toHaveText(opportunityName);
  await expect(page.getByTestId("opportunity-amount")).toHaveText(EXACT);
  await expect(page.getByTestId("opportunity-close-date")).toHaveText("2026-12-31");
  await expect(page.getByTestId("opportunity-stage")).toHaveText("Qualification");

  await page.goto(`/opportunities?display=kanban&q=${encodeURIComponent(opportunityName)}`);
  await expect(page.getByTestId("kanban-total-Qualification")).toHaveText(EXACT);
  await expect(page.getByTestId("kanban-total-Qualification")).not.toHaveText(String(Number(EXACT)));
  await expect(page.getByTestId("kanban-total-ClosedWon")).toBeVisible();
  await expect(page.getByTestId("kanban-total-ClosedLost")).toBeVisible();

  await page.getByRole("link", { name: opportunityName }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("dialog", { name: `Edit ${opportunityName}` })).toBeVisible();
  await page.locator("#field-stageName").selectOption("Proposal");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("opportunity-stage")).toHaveText("Proposal");
  await expect(page.getByTestId("opportunity-amount")).toHaveText(EXACT);

  await page.goto(`/opportunities?display=kanban&q=${encodeURIComponent(opportunityName)}`);
  await expect(page.getByTestId("kanban-total-Proposal")).toHaveText(EXACT);
  await expect(page.getByTestId("kanban-total-Qualification")).toHaveText("0.00");
  await expect(page.getByTestId("kanban-total-ClosedWon")).toHaveText("0.00");
  await expect(page.getByTestId("kanban-total-ClosedLost")).toHaveText("0.00");
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/opportunity-kanban.png", fullPage: true });
});

// Tableau de bord sur TEST_DATABASE_URL. Les noms portent « [test] ».
// Les montants sont comparés aux chaînes SQL, jamais à un flottant.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { createAccount } from "../../src/lib/accounts/service";
import { createContact } from "../../src/lib/contacts/service";
import { createLead } from "../../src/lib/leads/service";
import { createOpportunity } from "../../src/lib/opportunities/service";
import { DASHBOARD_STAGES, getDashboard, readCount } from "../../src/lib/dashboard/service";

const PREFIX = "[test] ";
const stamp = Date.now();
const EXACT = "9007199254740993.01";
const CLOSED = "250.50";

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

const sqlCount = async (table: "Account" | "Contact" | "Lead") => {
  const rows =
    table === "Account"
      ? await prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Account"`
      : table === "Contact"
        ? await prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Contact"`
        : await prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Lead"`;
  return readCount(rows[0]?.count);
};

const sqlStages = async () => {
  const rows = await prisma.$queryRaw<Array<{ stage: string; count: unknown; amount: unknown }>>`
    SELECT s.stage::text AS stage,
           COALESCE(agg.count, 0)::int AS count,
           COALESCE(agg.amount, 0)::text AS amount
    FROM unnest(ARRAY['Qualification','Proposal','Negotiation','ClosedWon','ClosedLost']::"OpportunityStage"[]) AS s(stage)
    LEFT JOIN (
      SELECT "stageName" AS stage, COUNT(*) AS count, SUM("amount") AS amount
      FROM "Opportunity"
      GROUP BY "stageName"
    ) agg ON agg.stage = s.stage
  `;
  return DASHBOARD_STAGES.map((stage) => {
    const row = rows.find((item) => item.stage === stage);
    assert.ok(row, stage);
    assert.equal(typeof row.amount, "string");
    return {
      stage,
      count: readCount(row.count),
      amount: new Prisma.Decimal(String(row.amount)).toFixed(2),
    };
  });
};

const sqlPipeline = async () => {
  const rows = await prisma.$queryRaw<Array<{ amount: unknown }>>`
    SELECT COALESCE(SUM("amount"), 0)::text AS amount
    FROM "Opportunity"
    WHERE "stageName" IN ('Qualification', 'Proposal', 'Negotiation')
  `;
  assert.equal(typeof rows[0]?.amount, "string");
  return new Prisma.Decimal(String(rows[0]?.amount)).toFixed(2);
};

const sqlOverdue = async () => {
  const rows = await prisma.$queryRaw<Array<{ count: unknown }>>`
    SELECT COUNT(*)::int AS count
    FROM "Task"
    WHERE "dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      AND "status" <> 'Completed'
  `;
  return readCount(rows[0]?.count);
};

let standard: CurrentUser;
let accountId: string;

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(PREFIX);
  await prisma.task.deleteMany({ where: { subject: { startsWith: prefix } } });
  await prisma.opportunity.deleteMany({
    where: { OR: [{ name: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }] },
  });
  await prisma.lead.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }] },
  });
  await prisma.contact.deleteMany({ where: { lastName: { startsWith: prefix } } });
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  standard = asUser(
    await prisma.user.upsert({
      where: { alias: `dashstd${stamp}` },
      update: {},
      create: { alias: `dashstd${stamp}`, firstName: "Dash", lastName: "Standard", role: "STANDARD" },
    }),
  );
  const account = await createAccount({ name: `${PREFIX}${stamp} Dash Account` }, standard);
  accountId = account.id;
});

after(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(`${PREFIX}${stamp}`);
  await prisma.task.deleteMany({ where: { subject: { startsWith: prefix } } });
  await prisma.opportunity.deleteMany({
    where: { OR: [{ name: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }] },
  });
  await prisma.lead.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }] },
  });
  await prisma.contact.deleteMany({ where: { lastName: { startsWith: prefix } } });
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: standard.id } });
  await prisma.$disconnect();
});

describe("dashboard aggregates", { concurrency: 1 }, () => {
  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("matches account, contact, and lead counts to SQL", async () => {
    const beforeAccounts = await sqlCount("Account");
    const beforeContacts = await sqlCount("Contact");
    const beforeLeads = await sqlCount("Lead");
    await createContact({ lastName: `${PREFIX}${stamp} Buyer`, accountId }, standard);
    await createLead({ lastName: `${PREFIX}${stamp} Lead`, company: `${PREFIX}${stamp} Co` }, standard);
    const snapshot = await getDashboard();
    assert.equal(snapshot.accounts, await sqlCount("Account"));
    assert.equal(snapshot.contacts, await sqlCount("Contact"));
    assert.equal(snapshot.leads, await sqlCount("Lead"));
    assert.equal(snapshot.accounts, beforeAccounts);
    assert.equal(snapshot.contacts, beforeContacts + 1);
    assert.equal(snapshot.leads, beforeLeads + 1);
  });

  it("returns 9007199254740993.01 for the Proposal stage and the open pipeline", async () => {
    const beforePipeline = await sqlPipeline();
    const beforeProposal = (await sqlStages()).find((row) => row.stage === "Proposal");
    assert.ok(beforeProposal);
    await createOpportunity(
      {
        name: `${PREFIX}${stamp} Exact`,
        stageName: "Proposal",
        amount: EXACT,
        closeDate: "2026-12-31",
        accountId,
      },
      standard,
    );
    const snapshot = await getDashboard();
    const proposal = snapshot.opportunitiesByStage.find((row) => row.stage === "Proposal");
    const expectedProposal = new Prisma.Decimal(beforeProposal.amount).plus(EXACT).toFixed(2);
    const expectedPipeline = new Prisma.Decimal(beforePipeline).plus(EXACT).toFixed(2);
    assert.ok(proposal);
    assert.equal(proposal.amount, expectedProposal);
    assert.equal(proposal.count, beforeProposal.count + 1);
    assert.equal(snapshot.pipelineAmount, expectedPipeline);
    assert.equal(typeof snapshot.pipelineAmount, "string");
    assert.notEqual(snapshot.pipelineAmount, new Prisma.Decimal(beforePipeline).plus(new Prisma.Decimal(Number(EXACT))).toFixed(2));
    assert.equal(snapshot.pipelineAmount, await sqlPipeline());
    assert.deepEqual(snapshot.opportunitiesByStage, await sqlStages());
  });

  it("keeps a ClosedWon amount on its stage and out of the pipeline", async () => {
    const pipelineBeforeClose = await sqlPipeline();
    const beforeWon = (await sqlStages()).find((row) => row.stage === "ClosedWon");
    assert.ok(beforeWon);
    await createOpportunity(
      {
        name: `${PREFIX}${stamp} Won`,
        stageName: "ClosedWon",
        amount: CLOSED,
        closeDate: "2026-11-01",
        accountId,
      },
      standard,
    );
    const snapshot = await getDashboard();
    const won = snapshot.opportunitiesByStage.find((row) => row.stage === "ClosedWon");
    assert.equal(won?.amount, new Prisma.Decimal(beforeWon.amount).plus(CLOSED).toFixed(2));
    assert.equal(won?.count, beforeWon.count + 1);
    assert.equal(snapshot.pipelineAmount, pipelineBeforeClose);
    assert.equal(snapshot.pipelineAmount, await sqlPipeline());
    assert.notEqual(snapshot.pipelineAmount, new Prisma.Decimal(pipelineBeforeClose).plus(CLOSED).toFixed(2));
  });

  it("lists every stage, including empty ones, with count 0 and amount 0.00", async () => {
    const snapshot = await getDashboard();
    assert.deepEqual(
      snapshot.opportunitiesByStage.map((row) => row.stage),
      [...DASHBOARD_STAGES],
    );
    for (const row of snapshot.opportunitiesByStage) {
      if (row.count === 0) assert.equal(row.amount, "0.00");
    }
    assert.deepEqual(snapshot.opportunitiesByStage, await sqlStages());
  });

  it("counts a task due yesterday when it is not completed, and ignores today, completed, and null due dates", async () => {
    const before = await sqlOverdue();
    assert.equal((await getDashboard()).overdueTasks, before);

    const createTask = async (subject: string, status: "NotStarted" | "Completed") =>
      prisma.task.create({
        data: {
          subject: `${PREFIX}${stamp} ${subject}`,
          status,
          priority: "Normal",
          completedAt: status === "Completed" ? new Date() : null,
          assigneeId: standard.id,
          ownerId: standard.id,
          createdById: standard.id,
          lastModifiedById: standard.id,
          accountId,
        },
      });

    const overdue = await createTask("overdue", "NotStarted");
    const today = await createTask("today", "NotStarted");
    const completed = await createTask("completed", "Completed");
    const undated = await createTask("undated", "NotStarted");

    await prisma.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
      WHERE "id" = ${overdue.id}
    `;
    await prisma.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      WHERE "id" = ${today.id}
    `;
    await prisma.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')
      WHERE "id" = ${completed.id}
    `;
    await prisma.$executeRaw`
      UPDATE "Task"
      SET "dueDate" = NULL
      WHERE "id" = ${undated.id}
    `;

    const flags = await prisma.$queryRaw<Array<{ subject: string; overdue: boolean | null }>>`
      SELECT "subject",
             ("dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AND "status" <> 'Completed') AS overdue
      FROM "Task"
      WHERE "subject" LIKE ${`${PREFIX}${stamp} %`}
      ORDER BY "subject"
    `;
    const flagFor = (subject: string) => flags.find((row) => row.subject.endsWith(subject))?.overdue;
    assert.equal(flagFor("overdue"), true);
    assert.equal(flagFor("today"), false);
    assert.equal(flagFor("completed"), false);
    assert.equal(flagFor("undated"), null);

    const snapshot = await getDashboard();
    assert.equal(snapshot.overdueTasks, before + 1);
    assert.equal(snapshot.overdueTasks, await sqlOverdue());
  });
});

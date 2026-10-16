// Opportunités sur TEST_DATABASE_URL. Les noms portent « [test] » et le
// nettoyage supprime les opportunités avant les comptes.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { createAccount } from "../../src/lib/accounts/service";
import { AMOUNT_MESSAGE, ValidationError } from "../../src/lib/opportunities/validation";
import { createOpportunity, listOpportunities, updateOpportunity } from "../../src/lib/opportunities/service";

const PREFIX = "[test] ";
const stamp = Date.now();
const EXACT = "9007199254740993.01";

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

let standard: CurrentUser;
let accountId: string;

const sqlAmount = async (stage: string) => {
  const rows = await prisma.$queryRaw<Array<{ amount: unknown }>>`
    SELECT COALESCE(SUM("amount"), 0)::text AS amount
    FROM "Opportunity"
    WHERE "stageName" = CAST(${stage} AS "OpportunityStage")
  `;
  assert.equal(typeof rows[0]?.amount, "string");
  return new Prisma.Decimal(String(rows[0]?.amount)).toFixed(2);
};

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  standard = asUser(
    await prisma.user.upsert({
      where: { alias: `oppstd${stamp}` },
      update: {},
      create: { alias: `oppstd${stamp}`, firstName: "Opp", lastName: "Standard", role: "STANDARD" },
    }),
  );
  const account = await createAccount({ name: `${PREFIX}${stamp} Pipe Account` }, standard);
  accountId = account.id;
});

after(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(`${PREFIX}${stamp}`);
  await prisma.opportunity.deleteMany({ where: { OR: [{ name: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }] } });
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: standard.id } });
  await prisma.$disconnect();
});

describe("opportunity lifecycle", { concurrency: 1 }, () => {
  const name = `${PREFIX}${stamp} Pipe`;
  let opportunityId: string;

  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("creates an opportunity with a decimal amount and a UTC close date", async () => {
    const created = await createOpportunity(
      {
        name,
        stageName: "Qualification",
        amount: EXACT,
        closeDate: "2026-12-31",
        probability: 60,
        accountId,
      },
      standard,
    );
    opportunityId = created.id;
    assert.equal(created.amount, EXACT);
    assert.equal(typeof created.amount, "string");
    assert.equal(created.closeDate, "2026-12-31");
    assert.equal(created.stageName, "Qualification");
    assert.equal(created.accountId, accountId);
    assert.notEqual(created.amount, String(Number(EXACT)));

    const rows = await prisma.$queryRaw<Array<{ exact: boolean; day: boolean }>>`
      SELECT ("amount" = ${EXACT}::numeric) AS exact,
             (("closeDate" AT TIME ZONE 'UTC')::date = DATE '2026-12-31') AS day
      FROM "Opportunity"
      WHERE "id" = ${created.id}
    `;
    assert.equal(rows[0]?.exact, true);
    assert.equal(rows[0]?.day, true);
  });

  it("rejects a JSON number and leaves the table unchanged", async () => {
    const before = await prisma.opportunity.count({ where: { name: { startsWith: `${PREFIX}${stamp}` } } });
    await assert.rejects(
      () =>
        createOpportunity(
          {
            name: `${PREFIX}${stamp} Rejected`,
            stageName: "Qualification",
            amount: 9007199254740993.01,
            closeDate: "2026-12-31",
            accountId,
          },
          standard,
        ),
      (error: unknown) => error instanceof ValidationError && error.fieldErrors.amount === AMOUNT_MESSAGE,
    );
    const after = await prisma.opportunity.count({ where: { name: { startsWith: `${PREFIX}${stamp}` } } });
    assert.equal(after, before);
  });

  it("accepts a transaction client and rolls the insert back with it", async () => {
    const rollbackName = `${PREFIX}${stamp} Rollback`;
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await createOpportunity(
          { name: rollbackName, stageName: "Negotiation", amount: "10.00", closeDate: "2026-12-31", accountId },
          standard,
          tx,
        );
        throw new Error("rollback");
      }),
    );
    assert.equal(await prisma.opportunity.findFirst({ where: { name: rollbackName } }), null);
  });

  it("updates the stage without changing the decimal amount", async () => {
    const updated = await updateOpportunity(
      opportunityId,
      {
        name,
        stageName: "Proposal",
        amount: EXACT,
        closeDate: "2026-12-31",
        probability: 60,
        accountId,
      },
      standard,
    );
    assert.equal(updated.stageName, "Proposal");
    assert.equal(updated.amount, EXACT);
    assert.equal(updated.closeDate, "2026-12-31");
    const row = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    assert.equal(row.stageName, "Proposal");
    assert.equal(row.amount?.toString(), EXACT);
  });

  it("matches each kanban column total to SUM(amount), including rows off the page", async () => {
    await createOpportunity(
      {
        name: `${PREFIX}${stamp} Extra`,
        stageName: "Proposal",
        amount: "1.00",
        closeDate: "2026-12-31",
        accountId,
      },
      standard,
    );
    const board = await listOpportunities(standard, { display: "kanban", pageSize: 1 });
    assert.ok(board.columns);
    assert.deepEqual(
      board.columns.map((column) => column.stage),
      ["Qualification", "Proposal", "Negotiation", "ClosedWon", "ClosedLost"],
    );
    for (const column of board.columns) {
      assert.equal(typeof column.amount, "string");
      assert.equal(column.amount, await sqlAmount(column.stage));
      assert.ok(column.count >= column.items.length);
    }
    const proposal = board.columns.find((column) => column.stage === "Proposal");
    assert.ok(proposal);
    assert.ok(proposal.count > proposal.items.length);
    assert.equal(proposal.amount, await sqlAmount("Proposal"));

    const filtered = await listOpportunities(standard, { display: "kanban", q: name, pageSize: 1 });
    const filteredProposal = filtered.columns?.find((column) => column.stage === "Proposal");
    assert.equal(filteredProposal?.count, 1);
    assert.equal(filteredProposal?.amount, EXACT);
    assert.equal(filtered.columns?.find((column) => column.stage === "ClosedWon")?.amount, "0.00");
    assert.equal(filtered.columns?.find((column) => column.stage === "ClosedLost")?.amount, "0.00");
  });
});

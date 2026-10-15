// Conversion de lead. TEST_DATABASE_URL est obligatoire. Les fiches portent
// le préfixe « [test] » et sont supprimées uniquement sur cette base.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { createAccount } from "../../src/lib/accounts/service";
import { QUALIFY_BEFORE_CONVERT } from "../../src/lib/leads/convert";
import { createLead, updateLead } from "../../src/lib/leads/service";
import { PATCH } from "../../src/app/api/leads/[id]/route";
import { POST as convertLeadRoute } from "../../src/app/api/leads/[id]/convert/route";
import { rememberUser, sessionCookieHeader } from "../session";

const PREFIX = "[test] ";
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const EXACT_AMOUNT = "9007199254740993.01";

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

let admin: CurrentUser;
let standard: CurrentUser;
let other: CurrentUser;

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

const jsonRequest = (method: string, url: string, alias: string, body?: unknown) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", cookie: sessionCookieHeader(alias) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const convert = (id: string, alias: string, body?: unknown) =>
  convertLeadRoute(jsonRequest("POST", `http://127.0.0.1/api/leads/${id}/convert`, alias, body ?? {}), { params: Promise.resolve({ id }) });

const totals = async () => ({
  accounts: await prisma.account.count(),
  contacts: await prisma.contact.count(),
  opportunities: await prisma.opportunity.count(),
});

const qualifiedLead = async (owner: CurrentUser, label: string) => {
  const lastName = `${PREFIX}${label} ${stamp}`;
  const company = `${PREFIX}${label} Co ${stamp}`;
  const created = await createLead(
    {
      firstName: "Ada",
      lastName,
      company,
      title: "Analyst",
      email: `${label}.${stamp}@analytical.example`,
      phone: "+1 555 0142",
      description: `${PREFIX}notes ${label}`,
    },
    owner,
  );
  const lead = await updateLead(created.id, { status: "Working", qualified: true }, owner);
  return { lead, lastName, company };
};

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  admin = asUser(
    await prisma.user.upsert({
      where: { alias: `cvtadm${stamp}` },
      update: {},
      create: { alias: `cvtadm${stamp}`, firstName: "Convert", lastName: "Admin", role: "ADMIN" },
    }),
  );
  standard = asUser(
    await prisma.user.upsert({
      where: { alias: `cvtstd${stamp}` },
      update: {},
      create: { alias: `cvtstd${stamp}`, firstName: "Convert", lastName: "Standard", role: "STANDARD" },
    }),
  );
  other = asUser(
    await prisma.user.upsert({
      where: { alias: `cvtoth${stamp}` },
      update: {},
      create: { alias: `cvtoth${stamp}`, firstName: "Convert", lastName: "Other", role: "STANDARD" },
    }),
  );
  rememberUser(admin);
  rememberUser(standard);
  rememberUser(other);
});

after(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(PREFIX);
  const userIds = [admin.id, standard.id, other.id];
  await prisma.opportunity.deleteMany({
    where: {
      OR: [{ name: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }, { primaryContact: { lastName: { startsWith: prefix } } }],
    },
  });
  await prisma.contact.deleteMany({ where: { lastName: { startsWith: prefix } } });
  await prisma.lead.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }, { ownerId: { in: userIds } }, { createdById: { in: userIds } }] },
  });
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("atomic lead conversion", () => {
  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("returns 400 and writes nothing when the lead is not qualified or Unqualified", async () => {
    const fresh = await createLead({ lastName: `${PREFIX}Unready ${stamp}`, company: `${PREFIX}Unready Co ${stamp}` }, standard);
    const unqualified = await createLead({ lastName: `${PREFIX}Dropped ${stamp}`, company: `${PREFIX}Dropped Co ${stamp}` }, standard);
    await updateLead(unqualified.id, { status: "Unqualified", qualified: false }, standard);
    const before = await totals();

    const notQualified = await convert(fresh.id, standard.alias, {});
    assert.equal(notQualified.status, 400);
    const notQualifiedBody = (await notQualified.json()) as { fieldErrors: { qualified: string } };
    assert.equal(notQualifiedBody.fieldErrors.qualified, QUALIFY_BEFORE_CONVERT);

    const wrongStatus = await convert(unqualified.id, standard.alias, { createOpportunity: true, accountName: `${PREFIX}Should Not Exist ${stamp}` });
    assert.equal(wrongStatus.status, 400);
    const wrongStatusBody = (await wrongStatus.json()) as { fieldErrors: { qualified: string } };
    assert.equal(wrongStatusBody.fieldErrors.qualified, QUALIFY_BEFORE_CONVERT);

    assert.deepEqual(await totals(), before);
    const stored = await prisma.lead.findMany({ where: { id: { in: [fresh.id, unqualified.id] } } });
    assert.equal(stored.every((lead) => lead.convertedAt === null && lead.status !== "Converted"), true);
  });

  it("returns 201 with an opportunity and stores the amount as the exact decimal string", async () => {
    const { lead, company, lastName } = await qualifiedLead(standard, "Exact");
    const before = await totals();
    const response = await convert(lead.id, standard.alias, {
      createOpportunity: true,
      accountName: company,
      opportunity: {
        name: `${PREFIX}Exact Deal ${stamp}`,
        amount: EXACT_AMOUNT,
        closeDate: "2026-12-31",
        stage: "Negotiation",
      },
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as { leadId: string; accountId: string; contactId: string; opportunityId: string; convertedAt: string };
    assert.equal(body.leadId, lead.id);
    assert.ok(body.accountId);
    assert.ok(body.contactId);
    assert.ok(body.opportunityId);
    assert.ok(body.convertedAt);

    const after = await totals();
    assert.equal(after.accounts, before.accounts + 1);
    assert.equal(after.contacts, before.contacts + 1);
    assert.equal(after.opportunities, before.opportunities + 1);

    const raw = await prisma.$queryRaw<Array<{ amount: string }>>`SELECT "amount"::text AS amount FROM "Opportunity" WHERE "id" = ${body.opportunityId}`;
    assert.equal(raw[0]?.amount, EXACT_AMOUNT);
    assert.notEqual(String(Number(EXACT_AMOUNT)), EXACT_AMOUNT);

    const account = await prisma.account.findUnique({ where: { id: body.accountId } });
    const contact = await prisma.contact.findUnique({ where: { id: body.contactId } });
    const opportunity = await prisma.opportunity.findUnique({ where: { id: body.opportunityId } });
    const storedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.equal(account?.name, company);
    assert.equal(account?.ownerId, standard.id);
    assert.equal(account?.createdById, standard.id);
    assert.equal(contact?.firstName, "Ada");
    assert.equal(contact?.lastName, lastName);
    assert.equal(contact?.email, `Exact.${stamp}@analytical.example`);
    assert.equal(contact?.phone, "+1 555 0142");
    assert.equal(contact?.title, "Analyst");
    assert.equal(contact?.description, `${PREFIX}notes Exact`);
    assert.equal(contact?.accountId, body.accountId);
    assert.equal(contact?.ownerId, standard.id);
    assert.equal(contact?.createdById, standard.id);
    assert.equal(opportunity?.accountId, body.accountId);
    assert.equal(opportunity?.primaryContactId, body.contactId);
    assert.equal(opportunity?.ownerId, standard.id);
    assert.equal(opportunity?.stageName, "Negotiation");
    assert.equal(storedLead?.status, "Converted");
    assert.equal(storedLead?.convertedAccountId, body.accountId);
    assert.equal(storedLead?.convertedContactId, body.contactId);
    assert.equal(storedLead?.convertedOpportunityId, body.opportunityId);
    assert.equal(storedLead?.convertedAt?.toISOString(), body.convertedAt);
  });

  it("returns 201 without an opportunity and does not match an existing account", async () => {
    const { lead, company } = await qualifiedLead(standard, "Plain");
    const prior = await createAccount({ name: company }, standard);
    const before = await totals();
    const response = await convert(lead.id, standard.alias, {});
    assert.equal(response.status, 201);
    const body = (await response.json()) as { accountId: string; contactId: string; opportunityId: string | null };
    assert.equal(body.opportunityId, null);
    assert.notEqual(body.accountId, prior.id);
    const after = await totals();
    assert.equal(after.accounts, before.accounts + 1);
    assert.equal(after.contacts, before.contacts + 1);
    assert.equal(after.opportunities, before.opportunities);
    const opportunity = await prisma.opportunity.findFirst({ where: { accountId: body.accountId } });
    assert.equal(opportunity, null);
    const stored = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.equal(stored?.convertedOpportunityId, null);
    assert.equal(stored?.status, "Converted");
  });

  it("returns 409 on a second POST and leaves row counts unchanged", async () => {
    const { lead, company } = await qualifiedLead(admin, "Twice");
    const first = await convert(lead.id, admin.alias, { accountName: company });
    assert.equal(first.status, 201);
    const created = (await first.json()) as { accountId: string; contactId: string; opportunityId: null; convertedAt: string };
    const before = await totals();
    const second = await convert(lead.id, admin.alias, {
      createOpportunity: true,
      accountName: `${PREFIX}Duplicate ${stamp}`,
      opportunity: { name: `${PREFIX}Duplicate Deal ${stamp}`, amount: "10.00", closeDate: "2026-12-31", stage: "Qualification" },
    });
    assert.equal(second.status, 409);
    const body = (await second.json()) as { error: string; conversion: { accountId: string; contactId: string; opportunityId: null; convertedAt: string } };
    assert.equal(body.error, "This lead is already converted.");
    assert.equal(body.conversion.accountId, created.accountId);
    assert.equal(body.conversion.contactId, created.contactId);
    assert.equal(body.conversion.opportunityId, null);
    assert.equal(body.conversion.convertedAt, created.convertedAt);
    assert.deepEqual(await totals(), before);
    assert.equal(await prisma.account.count({ where: { name: `${PREFIX}Duplicate ${stamp}` } }), 0);

    const patched = await PATCH(jsonRequest("PATCH", `http://127.0.0.1/api/leads/${lead.id}`, admin.alias, { company: `${PREFIX}Hijack ${stamp}` }), {
      params: Promise.resolve({ id: lead.id }),
    });
    assert.equal(patched.status, 409);
    const stored = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.equal(stored?.company, company);
  });

  it("rolls back the claim when createOpportunity fails on ClosedWon", async () => {
    const { lead } = await qualifiedLead(standard, "Closed");
    const before = await totals();
    const response = await convert(lead.id, standard.alias, {
      createOpportunity: true,
      opportunity: { amount: "15.00", closeDate: "2026-12-31", stage: "ClosedWon" },
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { fieldErrors: Record<string, string> };
    assert.match(body.fieldErrors["opportunity.stage"] ?? "", /ClosedWon/);
    assert.deepEqual(await totals(), before);
    const stored = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.equal(stored?.status, "Working");
    assert.equal(stored?.qualified, true);
    assert.equal(stored?.convertedAt, null);
    assert.equal(stored?.convertedAccountId, null);
    assert.equal(stored?.convertedContactId, null);
    assert.equal(stored?.convertedOpportunityId, null);
  });

  it("returns 403 for a standard user who does not own the lead", async () => {
    const { lead } = await qualifiedLead(standard, "Owned");
    const before = await totals();
    const response = await convert(lead.id, other.alias, {});
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "You can only edit leads you own.");
    assert.deepEqual(await totals(), before);
    const stored = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.equal(stored?.convertedAt, null);
    assert.equal(stored?.status, "Working");
  });

  it("returns 404 for an unknown lead", async () => {
    const before = await totals();
    const response = await convert(`missing-${stamp}`, admin.alias, {});
    assert.equal(response.status, 404);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, "Lead not found");
    assert.deepEqual(await totals(), before);
  });
});

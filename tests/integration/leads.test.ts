// Tests d'intégration Lead. TEST_DATABASE_URL est obligatoire. Les fiches
// portent le préfixe « [test] » et sont supprimées uniquement sur cette base.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { AuthorizationError } from "../../src/lib/auth/policies";
import { ConflictError } from "../../src/lib/errors";
import { ValidationError } from "../../src/lib/accounts/validation";
import { CONVERT_ACTION_MESSAGE, UNQUALIFIED_MESSAGE } from "../../src/lib/leads/validation";
import { readLeadListQuery } from "../../src/lib/leads/filters";
import { createLead, getLead, listLeads, updateLead } from "../../src/lib/leads/service";
import { GET, PATCH } from "../../src/app/api/leads/[id]/route";
import { POST } from "../../src/app/api/leads/route";

const PREFIX = "[test] ";
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

let admin: CurrentUser;
let standard: CurrentUser;

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

const jsonRequest = (method: string, url: string, alias: string, body?: unknown) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", "x-crm-lab-user": alias },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  admin = asUser(
    await prisma.user.upsert({
      where: { alias: `ldadm${stamp}` },
      update: {},
      create: { alias: `ldadm${stamp}`, firstName: "Lead", lastName: "Admin", role: "ADMIN" },
    }),
  );
  standard = asUser(
    await prisma.user.upsert({
      where: { alias: `ldstd${stamp}` },
      update: {},
      create: { alias: `ldstd${stamp}`, firstName: "Lead", lastName: "Standard", role: "STANDARD" },
    }),
  );
});

after(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(PREFIX);
  const userIds = [admin.id, standard.id];
  await prisma.task.deleteMany({
    where: { lead: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }, { ownerId: { in: userIds } }] } },
  });
  await prisma.lead.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }, { ownerId: { in: userIds } }, { createdById: { in: userIds } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("lead lifecycle", () => {
  let createdId: string;

  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("creates a lead owned by the current user with status New and qualified false", async () => {
    const beforeCount = await prisma.lead.count();
    const lead = await createLead(
      {
        firstName: "Maren",
        lastName: `${PREFIX}Alpha ${stamp}`,
        company: `${PREFIX}Paper Lantern ${stamp}`,
        email: `maren.${stamp}@paper-lantern.example`,
        phone: "+1 555 0199",
      },
      standard,
    );
    createdId = lead.id;
    assert.equal(lead.ownerId, standard.id);
    assert.equal(lead.createdBy.alias, standard.alias);
    assert.equal(lead.status, "New");
    assert.equal(lead.qualified, false);
    assert.equal(lead.conversion, null);
    assert.equal(await prisma.lead.count(), beforeCount + 1);

    await assert.rejects(createLead({ lastName: "  ", company: "" }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.lastName, "Complete this field.");
      assert.equal(error.fieldErrors.company, "Complete this field.");
      return true;
    });
  });

  it("qualifies a working lead and refuses qualified true while Unqualified", async () => {
    const qualified = await updateLead(createdId, { status: "Working", qualified: true }, standard);
    assert.equal(qualified.status, "Working");
    assert.equal(qualified.qualified, true);
    assert.equal(qualified.conversion, null);

    await assert.rejects(updateLead(createdId, { status: "Unqualified", qualified: true }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.qualified, UNQUALIFIED_MESSAGE);
      return true;
    });
    const unchanged = await getLead(createdId);
    assert.equal(unchanged?.status, "Working");
    assert.equal(unchanged?.qualified, true);

    const unqualified = await updateLead(createdId, { status: "Unqualified", qualified: false }, standard);
    assert.equal(unqualified.status, "Unqualified");
    assert.equal(unqualified.qualified, false);
    const restored = await updateLead(createdId, { status: "Working", qualified: true }, standard);
    assert.equal(restored.status, "Working");
    assert.equal(restored.qualified, true);
  });

  it("returns 400 when PATCH tries to set Converted or a converted column", async () => {
    for (const body of [{ status: "Converted" }, { convertedAt: "2026-10-14T18:00:00.000Z" }, { convertedAccountId: "acct" }, { convertedContactId: "ctc" }, { convertedOpportunityId: "opp" }]) {
      const response = await PATCH(jsonRequest("PATCH", `http://127.0.0.1/api/leads/${createdId}`, standard.alias, body), { params: Promise.resolve({ id: createdId }) });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { fieldErrors: { status: string } };
      assert.equal(payload.fieldErrors.status, CONVERT_ACTION_MESSAGE);
    }
    const stored = await getLead(createdId);
    assert.equal(stored?.status, "Working");
    assert.equal(stored?.convertedAt, null);
    assert.equal(stored?.qualified, true);
  });

  it("freezes a lead inserted directly as converted", async () => {
    const convertedAt = new Date("2026-10-14T18:00:00.000Z");
    const frozen = await prisma.lead.create({
      data: {
        firstName: "Nia",
        lastName: `${PREFIX}Frozen ${stamp}`,
        company: `${PREFIX}Frozen Co ${stamp}`,
        status: "Converted",
        qualified: true,
        convertedAt,
        ownerId: standard.id,
        createdById: standard.id,
        lastModifiedById: standard.id,
      },
    });
    await assert.rejects(updateLead(frozen.id, { status: "Working", qualified: true, lastName: `${PREFIX}Frozen ${stamp}`, company: `${PREFIX}Frozen Co ${stamp}` }, standard), (error: unknown) => {
      assert.ok(error instanceof ConflictError);
      assert.equal(error.message, "This lead is already converted.");
      assert.equal(error.conversion?.accountId, null);
      assert.equal(error.conversion?.contactId, null);
      assert.equal(error.conversion?.opportunityId, null);
      assert.equal(error.conversion?.convertedAt, convertedAt.toISOString());
      return true;
    });

    const response = await PATCH(jsonRequest("PATCH", `http://127.0.0.1/api/leads/${frozen.id}`, admin.alias, { status: "New", company: "Hijack" }), {
      params: Promise.resolve({ id: frozen.id }),
    });
    assert.equal(response.status, 409);
    const payload = (await response.json()) as { error: string; conversion: { convertedAt: string; accountId: null } };
    assert.equal(payload.error, "This lead is already converted.");
    assert.equal(payload.conversion.convertedAt, convertedAt.toISOString());
    assert.equal(payload.conversion.accountId, null);
    const stored = await prisma.lead.findUnique({ where: { id: frozen.id } });
    assert.equal(stored?.status, "Converted");
    assert.equal(stored?.company, `${PREFIX}Frozen Co ${stamp}`);
  });

  it("lists by search, sort, scope and filters, and records a fiche view", async () => {
    await createLead({ lastName: `${PREFIX}Zulu ${stamp}`, company: `${PREFIX}Zulu Co ${stamp}` }, standard);
    const query = readLeadListQuery(new URLSearchParams(`q=${encodeURIComponent(`Alpha ${stamp}`)}&scope=mine&sort=lastName&dir=asc`));
    const mine = await listLeads(standard, query);
    assert.equal(mine.total, 1);
    assert.equal(mine.items[0].id, createdId);
    assert.equal(mine.scope, "mine");

    const notMine = await listLeads(admin, { ...query, scope: "mine" });
    assert.equal(notMine.total, 0);

    const sorted = await listLeads(standard, readLeadListQuery(new URLSearchParams(`q=${encodeURIComponent(PREFIX)}&sort=lastName&dir=asc&pageSize=1`)));
    const sortedDesc = await listLeads(standard, readLeadListQuery(new URLSearchParams(`q=${encodeURIComponent(PREFIX)}&sort=lastName&dir=desc&pageSize=1`)));
    assert.ok(sorted.total >= 2);
    assert.notEqual(sorted.items[0].id, sortedDesc.items[0].id);

    const filtered = await listLeads(
      standard,
      readLeadListQuery(new URLSearchParams(`q=${encodeURIComponent(stamp)}&filters=${encodeURIComponent(JSON.stringify([{ field: "status", operator: "equals", value: "Working" }, { field: "qualified", operator: "equals", value: "true" }]))}&filterLogic=${encodeURIComponent("1 AND 2")}`)),
    );
    assert.ok(filtered.items.some((item) => item.id === createdId));
    assert.ok(filtered.items.every((item) => item.status === "Working" && item.qualified));

    const fiche = await GET(jsonRequest("GET", `http://127.0.0.1/api/leads/${createdId}`, standard.alias), { params: Promise.resolve({ id: createdId }) });
    assert.equal(fiche.status, 200);
    const dto = (await fiche.json()) as { canEdit: boolean; conversion: null; status: string };
    assert.equal(dto.canEdit, true);
    assert.equal(dto.conversion, null);
    assert.equal(dto.status, "Working");
    const recent = await listLeads(standard, readLeadListQuery(new URLSearchParams(`scope=recent&q=${encodeURIComponent(`Alpha ${stamp}`)}`)));
    assert.equal(recent.total, 1);
    assert.equal(recent.items[0].id, createdId);
  });

  it("lets the owner or an admin edit and only an admin reassign the owner", async () => {
    const other = asUser(await prisma.user.create({ data: { alias: `ldoth${stamp}`, firstName: "Lead", lastName: "Other", role: "STANDARD" } }));
    try {
      await assert.rejects(updateLead(createdId, { phone: "+1 555 0101" }, other), AuthorizationError);
    } finally {
      await prisma.lead.deleteMany({ where: { ownerId: other.id } });
      await prisma.user.delete({ where: { id: other.id } });
    }

    await assert.rejects(updateLead(createdId, { ownerId: admin.id }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.ownerId, "Only an administrator can assign another owner.");
      return true;
    });
    const reassigned = await updateLead(createdId, { ownerId: admin.id }, admin);
    assert.equal(reassigned.ownerId, admin.id);
    const back = await updateLead(createdId, { ownerId: standard.id }, admin);
    assert.equal(back.ownerId, standard.id);

    const created = await POST(
      jsonRequest("POST", "http://127.0.0.1/api/leads", standard.alias, {
        lastName: `${PREFIX}Api ${stamp}`,
        company: `${PREFIX}Api Co ${stamp}`,
      }),
    );
    assert.equal(created.status, 201);
    const payload = (await created.json()) as { status: string; qualified: boolean; conversion: null; ownerId: string };
    assert.equal(payload.status, "New");
    assert.equal(payload.qualified, false);
    assert.equal(payload.conversion, null);
    assert.equal(payload.ownerId, standard.id);
  });
});

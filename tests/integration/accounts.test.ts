// Tests d'intégration Prisma : TEST_DATABASE_URL est obligatoire (voir
// tests/preload-test-database.ts). Les enregistrements créés portent le
// préfixe « [test] » et sont supprimés à la fin, uniquement sur cette base.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { AuthorizationError } from "../../src/lib/auth/policies";
import { FilterError } from "../../src/lib/accounts/filters";
import { ListViewError, createView, deleteView, ensureSystemViews, findView, listVisibleViews, pinView, resolveDefaultView, setViewFilters, setViewVisibility } from "../../src/lib/accounts/list-views";
import { createAccount, getAccountWithRelated, globalSearch, listAccounts, lookupAccounts, recordView, updateAccount } from "../../src/lib/accounts/service";
import { recordRecentView } from "../../src/lib/recent/service";
import { ValidationError } from "../../src/lib/accounts/validation";

const PREFIX = "[test] ";
const stamp = Date.now();

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

let admin: CurrentUser;
let standard: CurrentUser;

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  await ensureSystemViews();
  admin = asUser(
    await prisma.user.upsert({
      where: { alias: `tstadm${stamp}` },
      update: {},
      create: { alias: `tstadm${stamp}`, firstName: "Test", lastName: "Admin", role: "ADMIN" },
    }),
  );
  standard = asUser(
    await prisma.user.upsert({
      where: { alias: `tststd${stamp}` },
      update: {},
      create: { alias: `tststd${stamp}`, firstName: "Test", lastName: "Standard", role: "STANDARD" },
    }),
  );
});

after(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  const prefix = assertCleanupPrefix(PREFIX);
  const userIds = [admin.id, standard.id];
  await prisma.task.deleteMany({
    where: { OR: [{ ownerId: { in: userIds } }, { assigneeId: { in: userIds } }, { account: { name: { startsWith: prefix } } }] },
  });
  await prisma.lead.deleteMany({ where: { OR: [{ ownerId: { in: userIds } }, { createdById: { in: userIds } }] } });
  await prisma.opportunity.deleteMany({ where: { OR: [{ ownerId: { in: userIds } }, { account: { name: { startsWith: prefix } } }] } });
  await prisma.contact.deleteMany({
    where: { OR: [{ ownerId: { in: userIds } }, { createdById: { in: userIds } }, { account: { name: { startsWith: prefix } } }] },
  });
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.listView.deleteMany({ where: { label: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("system list views", () => {
  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("exposes Recently Viewed, All Accounts, My Accounts and New This Week", async () => {
    const views = await listVisibleViews(standard);
    const names = views.filter((v) => v.isSystem).map((v) => v.developerName).sort();
    assert.deepEqual(names, ["AllAccounts", "MyAccounts", "NewThisWeek", "Recent"]);
    const recent = await findView("Recent", standard);
    assert.equal(recent?.scope, "RECENT");
    assert.deepEqual(recent?.columns, ["name", "phone", "ownerAlias"]);
  });

  it("defaults to All Accounts and honours a pinned view", async () => {
    const before = await resolveDefaultView(standard);
    assert.equal(before.developerName, "AllAccounts");
    const mine = await findView("MyAccounts", standard);
    await pinView(mine!.id, standard);
    const pinnedUser = { ...standard, pinnedAccountViewId: mine!.id };
    const after = await resolveDefaultView(pinnedUser);
    assert.equal(after.developerName, "MyAccounts");
  });
});

describe("account lifecycle", () => {
  let createdId: string;

  it("creates an account owned by the current user and tracks it as recently viewed", async () => {
    const account = await createAccount(
      {
        name: `${PREFIX}Alpha Ridge ${stamp}`,
        type: "Customer",
        industry: "Technology",
        annualRevenue: "2500000",
        billingCountryCode: "US",
        billingStateCode: "WA",
        billingCity: "Seattle",
        phone: "+1 555 0100",
      },
      standard,
    );
    createdId = account.id;
    assert.equal(account.ownerId, standard.id);
    assert.equal(account.createdBy.alias, standard.alias);
    assert.equal(account.billingCountry, "United States");
    assert.equal(account.billingState, "Washington");
    assert.equal(account.annualRevenue, "2500000");

    const recent = await listAccounts((await findView("Recent", standard))!, standard);
    assert.ok(recent.items.some((item) => item.id === createdId));
    assert.equal(recent.sortable, false);
  });

  it("rejects an account without a name", async () => {
    await assert.rejects(createAccount({ name: "" }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.name, "Complete this field.");
      return true;
    });
  });

  it("finds the account through All Accounts, My Accounts, New This Week, list search and global search", async () => {
    const all = await listAccounts((await findView("AllAccounts", standard))!, standard, { q: `Alpha Ridge ${stamp}` });
    assert.equal(all.total, 1);
    assert.equal(all.items[0].id, createdId);

    const mine = await listAccounts((await findView("MyAccounts", standard))!, standard, { q: `Alpha Ridge ${stamp}` });
    assert.equal(mine.total, 1);
    const notMine = await listAccounts((await findView("MyAccounts", admin))!, admin, { q: `Alpha Ridge ${stamp}` });
    assert.equal(notMine.total, 0);

    const fresh = await listAccounts((await findView("NewThisWeek", standard))!, standard, { q: `Alpha Ridge ${stamp}` });
    assert.equal(fresh.total, 1);

    const byPhone = await listAccounts((await findView("AllAccounts", standard))!, standard, { q: "555 0100" });
    assert.ok(byPhone.items.some((item) => item.id === createdId));

    const global = await globalSearch(`Alpha Ridge ${stamp}`);
    assert.equal(global.total, 1);

    const lookup = await lookupAccounts(`Alpha Ridge ${stamp}`);
    assert.equal(lookup[0]?.id, createdId);
  });

  it("sorts by a column and paginates", async () => {
    await createAccount({ name: `${PREFIX}Zulu Bay ${stamp}` }, standard);
    const view = (await findView("AllAccounts", standard))!;
    const asc = await listAccounts(view, standard, { q: PREFIX, sortField: "name", sortDirection: "asc", pageSize: 1 });
    const desc = await listAccounts(view, standard, { q: PREFIX, sortField: "name", sortDirection: "desc", pageSize: 1 });
    assert.equal(asc.pageSize, 1);
    assert.ok(asc.total >= 2);
    assert.notEqual(asc.items[0].id, desc.items[0].id);
    assert.ok(asc.items[0].name < desc.items[0].name);
    const page2 = await listAccounts(view, standard, { q: PREFIX, sortField: "name", sortDirection: "asc", pageSize: 1, page: 2 });
    assert.equal(page2.items[0].id, desc.items[0].id);
  });

  it("lets the owner edit, refuses another standard user and allows an administrator", async () => {
    const edited = await updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, website: "https://alpha.example", type: "Partner" }, standard);
    assert.equal(edited.website, "https://alpha.example");
    assert.equal(edited.type, "Partner");
    assert.equal(edited.lastModifiedBy.alias, standard.alias);

    const other = asUser(await prisma.user.create({ data: { alias: `tstoth${stamp}`, firstName: "Test", lastName: "Other", role: "STANDARD" } }));
    try {
      await assert.rejects(updateAccount(createdId, { name: "Hijack" }, other), AuthorizationError);
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }

    const byAdmin = await updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, rating: "Hot" }, admin);
    assert.equal(byAdmin.rating, "Hot");
    assert.equal(byAdmin.ownerId, standard.id, "editing does not change the owner");
  });

  it("keeps exact high-precision revenue across create and update", async () => {
    const precise = await createAccount({ name: `${PREFIX}Exact Revenue ${stamp}`, annualRevenue: "9007199254740993" }, standard);
    assert.equal(precise.annualRevenue, "9007199254740993");
    const updated = await updateAccount(precise.id, { name: precise.name, annualRevenue: "999999999999999999" }, standard);
    assert.equal(updated.annualRevenue, "999999999999999999");
  });

  it("only lets an administrator reassign the owner", async () => {
    await assert.rejects(updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, ownerId: admin.id }, standard), ValidationError);
    const reassigned = await updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, ownerId: admin.id }, admin);
    assert.equal(reassigned.ownerId, admin.id);
    const back = await updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, ownerId: standard.id }, admin);
    assert.equal(back.ownerId, standard.id);
  });

  it("maintains the parent hierarchy and refuses loops", async () => {
    const child = await createAccount({ name: `${PREFIX}Alpha Child ${stamp}`, parentId: createdId }, standard);
    assert.equal(child.parent?.id, createdId);
    const related = await getAccountWithRelated(createdId);
    assert.ok(related?.children.some((c) => c.id === child.id));

    await assert.rejects(updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, parentId: child.id }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.fieldErrors.parentId, /loop/);
      return true;
    });
    await assert.rejects(updateAccount(createdId, { name: `${PREFIX}Alpha Ridge ${stamp}`, parentId: createdId }, standard), ValidationError);
    await assert.rejects(createAccount({ name: `${PREFIX}Orphan ${stamp}`, parentId: "missing-parent" }, standard), ValidationError);
  });

  it("returns null for unknown accounts and records views idempotently", async () => {
    assert.equal(await getAccountWithRelated("does-not-exist"), null);
    await recordView(createdId, admin);
    await recordView(createdId, admin);
    const count = await prisma.recentlyViewed.count({ where: { accountId: createdId, userId: admin.id } });
    assert.equal(count, 1);
  });

  it("keeps non-account consultations out of the Account recent list", async () => {
    const contact = await prisma.contact.create({
      data: {
        lastName: `${PREFIX}Viewer ${stamp}`,
        ownerId: standard.id,
        createdById: standard.id,
        lastModifiedById: standard.id,
      },
    });
    try {
      await recordRecentView("Contact", contact.id, standard);
      const recent = await listAccounts((await findView("Recent", standard))!, standard);
      assert.ok(recent.items.some((item) => item.id === createdId));
      assert.ok(recent.items.every((item) => item.name.length > 0));
      assert.equal(
        recent.total,
        await prisma.recentlyViewed.count({
          where: { userId: standard.id, objectType: "Account", accountId: { not: null } },
        }),
      );
      assert.equal(await prisma.recentlyViewed.count({ where: { userId: standard.id, contactId: contact.id, accountId: null } }), 1);
    } finally {
      await prisma.contact.delete({ where: { id: contact.id } });
    }
  });

  it("writes the account and its recent view on the caller transaction", async () => {
    const name = `${PREFIX}Rollback ${stamp}`;
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const created = await createAccount({ name }, standard, tx);
        const inside = await tx.recentlyViewed.count({ where: { userId: standard.id, accountId: created.id } });
        assert.equal(inside, 1);
        throw new Error("abort createAccount transaction");
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "abort createAccount transaction");
        return true;
      },
    );
    assert.equal(await prisma.account.count({ where: { name } }), 0);
    assert.equal(await prisma.recentlyViewed.count({ where: { userId: standard.id, account: { name } } }), 0);
  });
});

describe("personal list views with filters", () => {
  it("creates a private view, saves filters with logic and applies them", async () => {
    const view = await createView({ label: `${PREFIX}US partners ${stamp}`, visibility: "PRIVATE", scope: "ALL", columns: ["name", "type", "billingCountryCode"] }, standard);
    assert.equal(view.ownerId, standard.id);
    assert.deepEqual(view.columns, ["name", "type", "billingCountryCode"]);

    const saved = await setViewFilters(
      view.id,
      [
        { field: "name", operator: "starts_with", value: PREFIX },
        { field: "type", operator: "equals", value: ["Partner"] },
        { field: "billingCountryCode", operator: "equals", value: ["US"] },
      ],
      "1 AND (2 OR 3)",
      standard,
    );
    assert.equal(saved.filterLogic, "1 AND (2 OR 3)");

    const partner = await createAccount({ name: `${PREFIX}Filter Partner ${stamp}`, type: "Partner", billingCountryCode: "DE" }, standard);
    const american = await createAccount({ name: `${PREFIX}Filter US ${stamp}`, type: "Prospect", billingCountryCode: "US" }, standard);
    const excluded = await createAccount({ name: `${PREFIX}Filter Excluded ${stamp}`, type: "Prospect", billingCountryCode: "FR" }, standard);

    const result = await listAccounts(saved, standard);
    const ids = result.items.map((item) => item.id);
    assert.ok(ids.includes(partner.id));
    assert.ok(ids.includes(american.id));
    assert.ok(!ids.includes(excluded.id));
    assert.ok(result.items.every((item) => item.name.startsWith(PREFIX) && (item.type === "Partner" || item.billingCountryCode === "US")));

    await assert.rejects(setViewFilters(view.id, [{ field: "name", operator: "equals", value: "x" }], "1 AND 2", standard), /filter 2 does not exist/);
  });

  it("matches annual revenue by the exact decimal and refuses filters that cannot be queried", async () => {
    const exact = "9007199254740993";
    const neighbor = "9007199254740992";
    const target = await createAccount({ name: `${PREFIX}Revenue Exact ${stamp}`, annualRevenue: exact }, standard);
    const other = await createAccount({ name: `${PREFIX}Revenue Neighbor ${stamp}`, annualRevenue: neighbor }, standard);
    const view = await createView({ label: `${PREFIX}Exact revenue ${stamp}` }, standard);

    const saved = await setViewFilters(view.id, [{ field: "annualRevenue", operator: "equals", value: exact }], null, standard);
    const matched = (await listAccounts(saved, standard)).items.map((item) => item.id);
    assert.deepEqual(matched, [target.id]);
    assert.ok(!matched.includes(other.id));

    const neighborView = await setViewFilters(view.id, [{ field: "annualRevenue", operator: "equals", value: neighbor }], null, standard);
    assert.deepEqual((await listAccounts(neighborView, standard)).items.map((item) => item.id), [other.id]);

    await assert.rejects(
      setViewFilters(view.id, [{ field: "numberOfEmployees", operator: "greater_than", value: "2147483648" }], null, standard),
      FilterError,
    );
    const persisted = await prisma.listView.findUniqueOrThrow({ where: { id: view.id } });
    assert.deepEqual(persisted.filters, [{ field: "annualRevenue", operator: "equals", value: neighbor }]);
  });

  it("hides private views from other users and shares them with Sharing Settings", async () => {
    const view = await createView({ label: `${PREFIX}Shared later ${stamp}` }, standard);
    assert.equal(await findView(view.id, admin) !== null, true, "administrators see every view");
    const other = asUser(await prisma.user.create({ data: { alias: `tstvis${stamp}`, firstName: "Test", lastName: "Viewer", role: "STANDARD" } }));
    try {
      assert.equal(await findView(view.id, other), null);
      await setViewVisibility(view.id, "EVERYONE", standard);
      assert.notEqual(await findView(view.id, other), null);
      await assert.rejects(deleteView(view.id, other), AuthorizationError);
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }
  });

  it("protects system views from standard users and from deletion", async () => {
    const all = (await findView("AllAccounts", standard))!;
    await assert.rejects(setViewFilters(all.id, [], null, standard), AuthorizationError);
    await assert.rejects(deleteView(all.id, admin), ListViewError);
    const recent = (await findView("Recent", admin))!;
    await assert.rejects(setViewFilters(recent.id, [], null, admin), ListViewError);
  });
});

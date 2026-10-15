// Contacts contre TEST_DATABASE_URL uniquement. Le préfixe « [test] » couvre
// aussi les libellés « [test] QA » du parcours 1. Les contacts sont supprimés
// avant les comptes.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { AuthorizationError } from "../../src/lib/auth/policies";
import { createAccount } from "../../src/lib/accounts/service";
import { FilterError } from "../../src/lib/contacts/filters";
import {
  LOOP_REPORTS_MESSAGE,
  SELF_REPORTS_MESSAGE,
  createContact,
  getContact,
  listContacts,
  updateContact,
} from "../../src/lib/contacts/service";
import { ValidationError } from "../../src/lib/contacts/validation";
import { GET as listRoute, POST as createRoute } from "../../src/app/api/contacts/route";
import { GET as readRoute, PATCH as patchRoute } from "../../src/app/api/contacts/[id]/route";
import { GET as lookupRoute } from "../../src/app/api/contacts/lookup/route";
import { rememberUser, sessionCookieHeader } from "../session";

const PREFIX = "[test] ";
const stamp = Date.now();
const select = { id: true, alias: true, firstName: true, lastName: true, role: true, pinnedAccountViewId: true } as const;

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

const asUser = (user: { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD"; pinnedAccountViewId: string | null }): CurrentUser => user;

let admin: CurrentUser;
let standard: CurrentUser;
let other: CurrentUser;

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  admin = asUser(await prisma.user.findUniqueOrThrow({ where: { alias: "demoadm" }, select }));
  standard = asUser(await prisma.user.findUniqueOrThrow({ where: { alias: "demostd" }, select }));
  other = asUser(
    await prisma.user.upsert({
      where: { alias: `tstc${stamp}` },
      update: {},
      create: { alias: `tstc${stamp}`, firstName: "Test", lastName: "Colleague", role: "STANDARD" },
      select,
    }),
  );
  rememberUser(admin);
  rememberUser(standard);
  rememberUser(other);
});

after(async () => {
  const prefix = assertCleanupPrefix(PREFIX);
  await assertConnectedTestDatabase(readCurrentDatabase);
  await prisma.contact.deleteMany({
    where: {
      OR: [
        { lastName: { startsWith: prefix } },
        { account: { name: { startsWith: prefix } } },
        ...(other ? [{ ownerId: other.id }, { createdById: other.id }] : []),
      ],
    },
  });
  await assertConnectedTestDatabase(readCurrentDatabase);
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
  if (other) {
    await assertConnectedTestDatabase(readCurrentDatabase);
    await prisma.user.deleteMany({ where: { id: other.id } });
  }
  await prisma.$disconnect();
});

const request = (path: string, user: string, init: RequestInit = {}) =>
  new Request(`http://127.0.0.1${path}`, { ...init, headers: { cookie: sessionCookieHeader(user), ...(init.headers ?? {}) } });

describe("contacts", { concurrency: false }, () => {
  let accountId: string;
  let contactId: string;
  const lastName = `${PREFIX}QA Contact ${stamp}`;
  const accountName = `${PREFIX}QA Account ${stamp}`;

  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("creates a contact owned by the caller and linked to an account", async () => {
    const account = await createAccount({ name: accountName }, standard);
    accountId = account.id;
    const contact = await createContact(
      {
        salutation: "Ms",
        lastName,
        email: `ada.${stamp}@qa.test`,
        phone: "555-0199",
        accountId,
        mailingCountryCode: "US",
        mailingStateCode: "WA",
        mailingCity: "Seattle",
      },
      standard,
    );
    contactId = contact.id;
    assert.equal(contact.lastName, lastName);
    assert.equal(contact.accountId, accountId);
    assert.equal(contact.ownerId, standard.id);
    assert.equal(contact.owner.alias, "demostd");
    assert.equal(contact.createdById, standard.id);
    assert.equal(contact.salutation, "Ms");
    assert.equal(contact.mailingCountry, "United States");
    assert.equal(contact.mailingState, "Washington");
    assert.equal(contact.account?.name, accountName);
  });

  it("rejects a missing last name and still accepts a contact without an account", async () => {
    await assert.rejects(createContact({ lastName: "  " }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.lastName, "Complete this field.");
      return true;
    });
    const orphan = await createContact({ lastName: `${PREFIX}QA Unlinked ${stamp}` }, standard);
    assert.equal(orphan.accountId, null);
    await assert.rejects(createContact({ lastName: `${PREFIX}QA Missing account ${stamp}`, accountId: "missing-account" }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.accountId, "Account not found.");
      return true;
    });
  });

  it("searches, sorts, filters and paginates without returning seeded contacts", async () => {
    const found = await listContacts(standard, { q: lastName.toLowerCase() });
    assert.equal(found.total, 1);
    assert.equal(found.items[0]?.id, contactId);
    assert.equal(found.sortField, "lastName");
    assert.equal(found.scope, "all");

    const byPhone = await listContacts(standard, { q: "555-0199" });
    assert.ok(byPhone.items.some((item) => item.id === contactId));
    const byAccount = await listContacts(standard, { q: lastName, sortField: "accountName", sortDirection: "desc" });
    assert.equal(byAccount.sortField, "accountName");
    assert.equal(byAccount.sortDirection, "desc");
    assert.equal(byAccount.items[0]?.id, contactId);

    const filtered = await listContacts(standard, {
      filters: [
        { field: "lastName", operator: "starts_with", value: `${PREFIX}QA Contact` },
        { field: "email", operator: "contains", value: `${stamp}@qa.test` },
      ],
      filterLogic: "1 AND 2",
    });
    assert.equal(filtered.total, 1);
    assert.equal(filtered.items[0]?.id, contactId);

    const mine = await listContacts(admin, { q: lastName, scope: "mine" });
    assert.equal(mine.total, 0);
    const owned = await listContacts(standard, { q: lastName, scope: "mine" });
    assert.equal(owned.total, 1);

    const page = await listContacts(standard, { q: PREFIX, page: 1, pageSize: 1, sortField: "lastName", sortDirection: "asc" });
    assert.equal(page.pageSize, 1);
    assert.equal(page.items.length, 1);
    assert.ok(page.total >= 2);
    const capped = await listContacts(standard, { pageSize: 500, q: lastName });
    assert.equal(capped.pageSize, 200);

    await assert.rejects(listContacts(standard, { filters: [{ field: "name", operator: "equals", value: "x" }] }), (error: unknown) => {
      assert.ok(error instanceof FilterError);
      return true;
    });
  });

  it("updates the title and keeps the account link", async () => {
    const updated = await updateContact(contactId, { lastName, accountId, title: "QA Buyer" }, standard);
    assert.equal(updated.title, "QA Buyer");
    assert.equal(updated.accountId, accountId);
    const rows = await prisma.contact.count({ where: { lastName } });
    assert.equal(rows, 1);
  });

  it("refuses a reports-to self reference or loop and accepts a manager on another account", async () => {
    await assert.rejects(updateContact(contactId, { lastName, accountId, title: "QA Buyer", reportsToId: contactId }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.reportsToId, SELF_REPORTS_MESSAGE);
      assert.equal(error.fieldErrors.reportsToId, "A contact cannot report to itself.");
      return true;
    });

    const manager = await createContact({ lastName: `${PREFIX}QA Manager ${stamp}`, accountId }, standard);
    const middle = await createContact({ lastName: `${PREFIX}QA Middle ${stamp}`, accountId, reportsToId: manager.id }, standard);
    await assert.rejects(updateContact(manager.id, { lastName: `${PREFIX}QA Manager ${stamp}`, accountId, reportsToId: middle.id }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.reportsToId, LOOP_REPORTS_MESSAGE);
      assert.equal(error.fieldErrors.reportsToId, "This contact would create a loop in the reporting line.");
      return true;
    });
    await assert.rejects(updateContact(contactId, { lastName, accountId, reportsToId: "missing-contact" }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.reportsToId, "Reports To contact not found.");
      return true;
    });

    const otherAccount = await createAccount({ name: `${PREFIX}QA Other Account ${stamp}` }, standard);
    const outsider = await createContact({ lastName: `${PREFIX}QA Outsider ${stamp}`, accountId: otherAccount.id }, standard);
    const linked = await updateContact(contactId, { lastName, accountId, title: "QA Buyer", reportsToId: outsider.id }, standard);
    assert.equal(linked.reportsToId, outsider.id);
    assert.equal(linked.accountId, accountId);
    const detail = await getContact(contactId);
    assert.equal(detail?.reportsTo?.id, outsider.id);
    const outsiderDetail = await getContact(outsider.id);
    assert.ok(outsiderDetail?.directReports.some((report) => report.id === contactId));
  });

  it("lets the owner or an administrator edit and refuses another standard user", async () => {
    await assert.rejects(updateContact(contactId, { lastName, accountId, title: "QA Buyer" }, other), (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      assert.equal(error.message, "You can only edit contacts you own.");
      return true;
    });
    const byAdmin = await updateContact(contactId, { lastName, accountId, title: "QA Buyer" }, admin);
    assert.equal(byAdmin.title, "QA Buyer");
    assert.equal(byAdmin.lastModifiedById, admin.id);

    await assert.rejects(updateContact(contactId, { lastName, accountId, title: "QA Buyer", ownerId: admin.id }, standard), (error: unknown) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.fieldErrors.ownerId, "Only an administrator can assign another owner.");
      return true;
    });
    const reassigned = await updateContact(contactId, { lastName, accountId, title: "QA Buyer", ownerId: admin.id }, admin);
    assert.equal(reassigned.ownerId, admin.id);
    const restored = await updateContact(contactId, { lastName, accountId, title: "QA Buyer", ownerId: standard.id }, admin);
    assert.equal(restored.ownerId, standard.id);
    const byOwner = await updateContact(contactId, { lastName, accountId, title: "QA Buyer" }, standard);
    assert.equal(byOwner.title, "QA Buyer");
  });

  it("inserts through the transaction client and rolls the contact back with the account", async () => {
    const txLastName = `${PREFIX}QA Tx ${stamp}`;
    const created = await prisma.$transaction(async (tx) => {
      const account = await createAccount({ name: `${PREFIX}QA Tx Account ${stamp}` }, standard, tx);
      return createContact({ lastName: txLastName, accountId: account.id }, standard, tx);
    });
    assert.equal(created.lastName, txLastName);
    assert.ok(created.accountId);

    const rollbackName = `${PREFIX}QA Rollback ${stamp}`;
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const account = await createAccount({ name: `${PREFIX}QA Rollback Account ${stamp}` }, standard, tx);
        await createContact({ lastName: rollbackName, accountId: account.id }, standard, tx);
        throw new Error("rollback");
      }),
    );
    assert.equal(await prisma.contact.count({ where: { lastName: rollbackName } }), 0);
    assert.equal(await prisma.account.count({ where: { name: `${PREFIX}QA Rollback Account ${stamp}` } }), 0);
  });

  it("serves the contact HTTP contract, including lookup and a recorded view", async () => {
    const created = await createRoute(
      request("/api/contacts", "demostd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lastName: `${PREFIX}QA Http ${stamp}`, accountId }),
      }),
    );
    assert.equal(created.status, 201);
    const createdBody = (await created.json()) as { id: string; lastName: string; accountId: string; owner: { alias: string } };
    assert.equal(createdBody.lastName, `${PREFIX}QA Http ${stamp}`);
    assert.equal(createdBody.accountId, accountId);
    assert.equal(createdBody.owner.alias, "demostd");

    const invalid = await createRoute(
      request("/api/contacts", "demostd", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }),
    );
    assert.equal(invalid.status, 400);
    assert.equal(((await invalid.json()) as { error: string }).error, "Invalid JSON body");

    const missingName = await createRoute(
      request("/api/contacts", "demostd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Ada" }) }),
    );
    assert.equal(missingName.status, 400);
    const missingBody = (await missingName.json()) as { error: string; fieldErrors: { lastName: string } };
    assert.equal(missingBody.error, "Validation failed");
    assert.equal(missingBody.fieldErrors.lastName, "Complete this field.");

    const listed = await listRoute(request(`/api/contacts?q=${encodeURIComponent(lastName)}&scope=all`, "demostd"));
    assert.equal(listed.status, 200);
    const listBody = (await listed.json()) as { total: number; items: Array<{ id: string }>; sortField: string; scope: string };
    assert.equal(listBody.total, 1);
    assert.equal(listBody.items[0]?.id, contactId);
    assert.equal(listBody.sortField, "lastName");
    assert.equal(listBody.scope, "all");

    const read = await readRoute(request(`/api/contacts/${contactId}`, "demostd"), { params: Promise.resolve({ id: contactId }) });
    assert.equal(read.status, 200);
    const readBody = (await read.json()) as { canEdit: boolean; account: { id: string }; title: string };
    assert.equal(readBody.canEdit, true);
    assert.equal(readBody.account.id, accountId);
    assert.equal(readBody.title, "QA Buyer");
    const viewed = await prisma.recentlyViewed.findFirst({ where: { userId: standard.id, contactId, objectType: "Contact" } });
    assert.ok(viewed);

    const recent = await listContacts(standard, { scope: "recent", q: lastName });
    assert.equal(recent.total, 1);
    assert.equal(recent.sortField, null);
    assert.equal(recent.items[0]?.id, contactId);

    const patched = await patchRoute(request(`/api/contacts/${contactId}`, "demostd", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "QA Buyer" }) }), {
      params: Promise.resolve({ id: contactId }),
    });
    assert.equal(patched.status, 200);
    const patchedBody = (await patched.json()) as { title: string; accountId: string };
    assert.equal(patchedBody.title, "QA Buyer");
    assert.equal(patchedBody.accountId, accountId);

    const forbidden = await patchRoute(
      request(`/api/contacts/${contactId}`, other.alias, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Nope" }) }),
      { params: Promise.resolve({ id: contactId }) },
    );
    assert.equal(forbidden.status, 403);
    assert.equal(((await forbidden.json()) as { error: string }).error, "You can only edit contacts you own.");

    const absent = await readRoute(request("/api/contacts/missing", "demostd"), { params: Promise.resolve({ id: "missing" }) });
    assert.equal(absent.status, 404);
    assert.equal(((await absent.json()) as { error: string }).error, "Contact not found");

    const suggestions = await lookupRoute(request(`/api/contacts/lookup?q=${encodeURIComponent(`${PREFIX}QA`)}&exclude=${contactId}`, "demostd"));
    assert.equal(suggestions.status, 200);
    const suggestionBody = (await suggestions.json()) as { items: Array<{ id: string; firstName: string | null; lastName: string }> };
    assert.ok(suggestionBody.items.length > 0);
    assert.ok(suggestionBody.items.length <= 8);
    assert.equal(suggestionBody.items.some((item) => item.id === contactId), false);
    assert.ok(suggestionBody.items.every((item) => "firstName" in item && "lastName" in item));
  });
});

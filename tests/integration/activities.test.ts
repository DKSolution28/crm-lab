// Tâches contre TEST_DATABASE_URL uniquement. Les tâches sont supprimées
// avant les parents. Le préfixe « [test] » couvre aussi « [test] QA ».
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl, databaseNameOf } from "../test-database";
import type { CurrentUser } from "../../src/lib/auth/current-user";
import { AuthorizationError } from "../../src/lib/auth/policies";
import { createAccount } from "../../src/lib/accounts/service";
import { createContact } from "../../src/lib/contacts/service";
import { createLead } from "../../src/lib/leads/service";
import { createOpportunity } from "../../src/lib/opportunities/service";
import { UnknownParentError, createTask, listTasks, updateTask } from "../../src/lib/activities/service";
import { EXACTLY_ONE_PARENT_MESSAGE, ParentRequiredError, ValidationError } from "../../src/lib/activities/validation";
import { GET as listRoute, POST as createRoute } from "../../src/app/api/tasks/route";
import { GET as readRoute, PATCH as patchRoute } from "../../src/app/api/tasks/[id]/route";
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

const cleanup = async () => {
  const prefix = assertCleanupPrefix(PREFIX);
  await assertConnectedTestDatabase(readCurrentDatabase);
  await prisma.task.deleteMany({ where: { subject: { startsWith: prefix } } });
  await assertConnectedTestDatabase(readCurrentDatabase);
  await prisma.contact.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { account: { name: { startsWith: prefix } } }] },
  });
  await prisma.lead.deleteMany({
    where: { OR: [{ lastName: { startsWith: prefix } }, { company: { startsWith: prefix } }] },
  });
  await prisma.opportunity.deleteMany({ where: { name: { startsWith: prefix } } });
  await assertConnectedTestDatabase(readCurrentDatabase);
  await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
};

before(async () => {
  await assertConnectedTestDatabase(readCurrentDatabase);
  await cleanup();
  admin = asUser(await prisma.user.findUniqueOrThrow({ where: { alias: "demoadm" }, select }));
  standard = asUser(await prisma.user.findUniqueOrThrow({ where: { alias: "demostd" }, select }));
  rememberUser(admin);
  rememberUser(standard);
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const request = (path: string, user: string, init: RequestInit = {}) =>
  new Request(`http://127.0.0.1${path}`, { ...init, headers: { cookie: sessionCookieHeader(user), ...(init.headers ?? {}) } });

describe("activities", { concurrency: false }, () => {
  it("is connected to the disposable database named by TEST_DATABASE_URL", async () => {
    const actual = await readCurrentDatabase();
    assert.equal(actual, databaseNameOf(assertTestDatabaseUrl()));
    assert.notEqual(actual, "crm_lab");
  });

  it("creates a task on an account with assignee, due date and priority", async () => {
    const account = await createAccount({ name: `${PREFIX}QA Account ${stamp}` }, admin);
    const before = await prisma.account.findUniqueOrThrow({ where: { id: account.id }, select: { lastActivityDate: true } });
    const created = await createRoute(
      request("/api/tasks", "demoadm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: `${PREFIX}QA Call ${stamp}`,
          priority: "High",
          dueDate: "2026-12-31",
          assigneeId: standard.id,
          parent: { type: "Account", id: account.id },
        }),
      }),
    );
    assert.equal(created.status, 201);
    const body = (await created.json()) as {
      id: string;
      subject: string;
      status: string;
      priority: string;
      dueDate: string;
      assigneeId: string;
      ownerId: string;
      assignee: { alias: string };
      owner: { alias: string };
      parent: { type: string; id: string };
      completedAt: string | null;
    };
    assert.equal(body.subject, `${PREFIX}QA Call ${stamp}`);
    assert.equal(body.status, "NotStarted");
    assert.equal(body.priority, "High");
    assert.equal(body.dueDate, "2026-12-31");
    assert.equal(body.assigneeId, standard.id);
    assert.equal(body.assignee.alias, "demostd");
    assert.equal(body.ownerId, admin.id);
    assert.equal(body.owner.alias, "demoadm");
    assert.equal(body.completedAt, null);
    assert.deepEqual(body.parent, { type: "Account", id: account.id });

    const row = await prisma.task.findUniqueOrThrow({ where: { id: body.id } });
    assert.equal(row.accountId, account.id);
    assert.equal(row.contactId, null);
    assert.equal(row.leadId, null);
    assert.equal(row.opportunityId, null);
    assert.equal(row.dueDate?.toISOString().slice(0, 10), "2026-12-31");

    const activity = await prisma.account.findUniqueOrThrow({ where: { id: account.id }, select: { lastActivityDate: true } });
    assert.ok(activity.lastActivityDate);
    if (before.lastActivityDate) assert.ok(activity.lastActivityDate >= before.lastActivityDate);

    const read = await readRoute(request(`/api/tasks/${body.id}`, "demostd"), { params: Promise.resolve({ id: body.id }) });
    assert.equal(read.status, 200);
    const readBody = (await read.json()) as { canEdit: boolean; parent: { type: string } };
    assert.equal(readBody.canEdit, false);
    assert.equal(readBody.parent.type, "Account");
    const ownerRead = await readRoute(request(`/api/tasks/${body.id}`, "demoadm"), { params: Promise.resolve({ id: body.id }) });
    assert.equal(((await ownerRead.json()) as { canEdit: boolean }).canEdit, true);
  });

  it("moves a completed account task from open to history and clears completedAt when reopened", async () => {
    const account = await prisma.account.findFirstOrThrow({ where: { name: `${PREFIX}QA Account ${stamp}` }, select: { id: true } });
    const early = await createTask(
      { subject: `${PREFIX}QA Early ${stamp}`, dueDate: "2026-11-01", priority: "Low", parent: { type: "Account", id: account.id } },
      admin,
    );
    const late = await createTask(
      { subject: `${PREFIX}QA Late ${stamp}`, dueDate: "2026-12-02", parent: { type: "Account", id: account.id } },
      admin,
    );
    const openBefore = await listTasks("Account", account.id);
    const earlyIndex = openBefore.open.findIndex((task) => task.id === early.id);
    const lateIndex = openBefore.open.findIndex((task) => task.id === late.id);
    assert.ok(earlyIndex >= 0 && lateIndex >= 0 && earlyIndex < lateIndex);
    assert.equal(openBefore.history.some((task) => task.id === early.id), false);

    const completed = await updateTask(early.id, { status: "Completed" }, admin);
    assert.equal(completed.status, "Completed");
    assert.ok(completed.completedAt);
    assert.deepEqual(completed.parent, { type: "Account", id: account.id });
    const listed = await listRoute(request(`/api/tasks?parentType=Account&parentId=${account.id}`, "demoadm"));
    assert.equal(listed.status, 200);
    const lists = (await listed.json()) as { open: Array<{ id: string }>; history: Array<{ id: string; status: string }> };
    assert.equal(lists.open.some((task) => task.id === early.id), false);
    assert.equal(lists.history.some((task) => task.id === early.id && task.status === "Completed"), true);
    assert.equal(await prisma.task.count({ where: { subject: `${PREFIX}QA Early ${stamp}` } }), 1);

    const later = await updateTask(late.id, { status: "Completed" }, admin);
    const history = (await listTasks("Account", account.id)).history.filter((task) => task.id === early.id || task.id === late.id);
    assert.equal(history[0]?.id, later.id);
    assert.ok((history[0]?.completedAt ?? "") >= (history[1]?.completedAt ?? ""));

    const reopened = await updateTask(early.id, { status: "InProgress" }, admin);
    assert.equal(reopened.status, "InProgress");
    assert.equal(reopened.completedAt, null);
    const afterReopen = await listTasks("Account", account.id);
    assert.equal(afterReopen.open.some((task) => task.id === early.id), true);
    assert.equal(afterReopen.history.some((task) => task.id === early.id), false);
  });

  it("rejects two parents before insert", async () => {
    const account = await prisma.account.findFirstOrThrow({ where: { name: `${PREFIX}QA Account ${stamp}` }, select: { id: true } });
    const contact = await createContact({ lastName: `${PREFIX}QA Contact ${stamp}`, accountId: account.id }, admin);
    const subject = `${PREFIX}QA Two parents ${stamp}`;
    assert.equal(await prisma.task.count({ where: { subject } }), 0);
    await assert.rejects(
      createTask({ subject, parent: { type: "Account", id: account.id }, contactId: contact.id }, admin),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.fieldErrors.parent, EXACTLY_ONE_PARENT_MESSAGE);
        return true;
      },
    );
    assert.equal(await prisma.task.count({ where: { subject } }), 0);

    const response = await createRoute(
      request("/api/tasks", "demoadm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, accountId: account.id, leadId: "another-parent" }),
      }),
    );
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: string; fieldErrors: { parent: string } };
    assert.equal(body.error, "Validation failed");
    assert.equal(body.fieldErrors.parent, "A task has exactly one parent.");
    assert.equal(await prisma.task.count({ where: { subject } }), 0);
  });

  it("requires a parent and returns 404 when the parent does not exist", async () => {
    const missing = await createRoute(
      request("/api/tasks", "demoadm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: `${PREFIX}QA Missing parent ${stamp}` }),
      }),
    );
    assert.equal(missing.status, 400);
    assert.deepEqual(await missing.json(), { error: "A parent record is required." });

    const incoherent = await listRoute(request("/api/tasks?parentType=Widget&parentId=abc", "demoadm"));
    assert.equal(incoherent.status, 400);
    assert.deepEqual(await incoherent.json(), { error: "A parent record is required." });

    await assert.rejects(createTask({ subject: `${PREFIX}QA No parent ${stamp}` }, admin), (error: unknown) => {
      assert.ok(error instanceof ParentRequiredError);
      assert.equal(error.message, "A parent record is required.");
      return true;
    });

    const unknown = await createRoute(
      request("/api/tasks", "demoadm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: `${PREFIX}QA Missing record ${stamp}`, parent: { type: "Account", id: "missing-account" } }),
      }),
    );
    assert.equal(unknown.status, 404);
    const unknownBody = (await unknown.json()) as { error: string; fieldErrors: { parent: string } };
    assert.equal(unknownBody.error, "Record not found");
    assert.equal(unknownBody.fieldErrors.parent, "The related record was not found.");
    assert.equal(await prisma.task.count({ where: { subject: `${PREFIX}QA Missing record ${stamp}` } }), 0);

    await assert.rejects(
      createTask({ subject: `${PREFIX}QA Missing record service ${stamp}`, parent: { type: "Contact", id: "missing-contact" } }, admin),
      (error: unknown) => {
        assert.ok(error instanceof UnknownParentError);
        assert.equal(error.message, "Record not found");
        assert.equal(error.fieldErrors.parent, "The related record was not found.");
        return true;
      },
    );
  });

  it("refuses a PATCH from the assignee when they are not the owner", async () => {
    const account = await prisma.account.findFirstOrThrow({ where: { name: `${PREFIX}QA Account ${stamp}` }, select: { id: true } });
    const task = await createTask(
      {
        subject: `${PREFIX}QA Owned ${stamp}`,
        assigneeId: standard.id,
        priority: "Normal",
        parent: { type: "Account", id: account.id },
      },
      admin,
    );
    assert.equal(task.ownerId, admin.id);
    assert.equal(task.assigneeId, standard.id);
    const forbidden = await patchRoute(
      request(`/api/tasks/${task.id}`, "demostd", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: `${PREFIX}QA Hijack ${stamp}` }),
      }),
      { params: Promise.resolve({ id: task.id }) },
    );
    assert.equal(forbidden.status, 403);
    assert.equal(((await forbidden.json()) as { error: string }).error, "You can only edit tasks you own.");
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(stored.subject, `${PREFIX}QA Owned ${stamp}`);
    assert.equal(stored.accountId, account.id);

    await assert.rejects(updateTask(task.id, { subject: `${PREFIX}QA Hijack ${stamp}` }, standard), (error: unknown) => {
      assert.ok(error instanceof AuthorizationError);
      assert.equal(error.message, "You can only edit tasks you own.");
      return true;
    });

    const patched = await patchRoute(
      request(`/api/tasks/${task.id}`, "demoadm", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority: "High" }),
      }),
      { params: Promise.resolve({ id: task.id }) },
    );
    assert.equal(patched.status, 200);
    assert.equal(((await patched.json()) as { priority: string; parent: { id: string } }).priority, "High");
    assert.equal(((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).priority), "High");
  });

  it("does not change the parent on PATCH", async () => {
    const account = await prisma.account.findFirstOrThrow({ where: { name: `${PREFIX}QA Account ${stamp}` }, select: { id: true } });
    const contact = await prisma.contact.findFirstOrThrow({ where: { lastName: `${PREFIX}QA Contact ${stamp}` }, select: { id: true } });
    const task = await prisma.task.findFirstOrThrow({ where: { subject: `${PREFIX}QA Owned ${stamp}` } });
    const response = await patchRoute(
      request(`/api/tasks/${task.id}`, "demoadm", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "Completed", parent: { type: "Contact", id: contact.id } }),
      }),
      { params: Promise.resolve({ id: task.id }) },
    );
    assert.equal(response.status, 400);
    assert.equal(((await response.json()) as { fieldErrors: { parent: string } }).fieldErrors.parent, "The parent cannot be changed.");
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(stored.status, "NotStarted");
    assert.equal(stored.accountId, account.id);
    assert.equal(stored.contactId, null);
  });

  it("writes lastActivityDate when a contact task is completed and does not require that column on a lead", async () => {
    const contact = await prisma.contact.findFirstOrThrow({ where: { lastName: `${PREFIX}QA Contact ${stamp}` }, select: { id: true } });
    const task = await createTask({ subject: `${PREFIX}QA Contact task ${stamp}`, parent: { type: "Contact", id: contact.id } }, standard);
    assert.equal(task.ownerId, standard.id);
    assert.equal(task.assigneeId, standard.id);
    assert.equal(task.parent.type, "Contact");
    const createdActivity = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id }, select: { lastActivityDate: true } });
    assert.ok(createdActivity.lastActivityDate);

    await prisma.contact.update({ where: { id: contact.id }, data: { lastActivityDate: new Date("2000-01-01T00:00:00.000Z") } });
    const completed = await updateTask(task.id, { status: "Completed" }, standard);
    assert.equal(completed.status, "Completed");
    assert.ok(completed.completedAt);
    const after = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id }, select: { lastActivityDate: true } });
    assert.ok(after.lastActivityDate);
    assert.ok(after.lastActivityDate > new Date("2000-01-02T00:00:00.000Z"));

    const lead = await createLead({ lastName: `${PREFIX}QA Lead ${stamp}`, company: `${PREFIX}QA Company ${stamp}` }, admin);
    const leadTask = await createTask(
      { subject: `${PREFIX}QA Lead task ${stamp}`, status: "Completed", priority: "High", parent: { type: "Lead", id: lead.id } },
      admin,
    );
    assert.equal(leadTask.status, "Completed");
    assert.ok(leadTask.completedAt);
    assert.deepEqual(leadTask.parent, { type: "Lead", id: lead.id });
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: leadTask.id } });
    assert.equal(stored.leadId, lead.id);
    assert.equal(stored.accountId, null);
    assert.equal(stored.contactId, null);
    assert.equal(stored.opportunityId, null);
    const leadColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Lead' AND column_name = 'lastActivityDate'
    `;
    assert.equal(leadColumns.length, 0);

    const account = await prisma.account.findFirstOrThrow({ where: { name: `${PREFIX}QA Account ${stamp}` }, select: { id: true } });
    const opportunity = await createOpportunity(
      { name: `${PREFIX}QA Opportunity ${stamp}`, accountId: account.id, closeDate: "2026-12-31", stageName: "Qualification" },
      admin,
    );
    const opportunityTask = await createTask(
      { subject: `${PREFIX}QA Opportunity task ${stamp}`, parent: { type: "Opportunity", id: opportunity.id } },
      admin,
    );
    assert.deepEqual(opportunityTask.parent, { type: "Opportunity", id: opportunity.id });
    const opportunityRow = await prisma.task.findUniqueOrThrow({ where: { id: opportunityTask.id } });
    assert.equal(opportunityRow.opportunityId, opportunity.id);
    assert.equal(opportunityRow.accountId, null);
  });
});

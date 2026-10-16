// Sessions signées. TEST_DATABASE_URL est obligatoire. Aucun repli administrateur.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../test-database";
import { DEMO_PASSWORDS, hashPassword } from "../../src/lib/auth/password";
import { signSession, SESSION_COOKIE } from "../../src/lib/auth/session";
import { POST as login } from "../../src/app/api/auth/login/route";
import { GET as listUsers } from "../../src/app/api/users/route";
import { POST as createAccount } from "../../src/app/api/accounts/route";
import { PATCH as updateAccount } from "../../src/app/api/accounts/[id]/route";

const PREFIX = "[test] Auth ";
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const readCurrentDatabase = async () => {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

const cookieOf = (response: Response) => {
  const header = response.headers.get("set-cookie") ?? "";
  const pair = header.split(";")[0];
  assert.match(pair, new RegExp(`^${SESSION_COOKIE}=`));
  return pair;
};

describe("authenticated sessions", { concurrency: false }, () => {
  let ownerAlias = "";
  let otherAlias = "";

  before(async () => {
    await assertConnectedTestDatabase(readCurrentDatabase);
    assertTestDatabaseUrl();
    const ownerHash = await hashPassword("owner-pass");
    const otherHash = await hashPassword("other-pass");
    ownerAlias = `own${stamp}`;
    otherAlias = `oth${stamp}`;
    await prisma.user.create({ data: { alias: ownerAlias, firstName: "Auth", lastName: "Owner", role: "STANDARD", passwordHash: ownerHash } });
    await prisma.user.create({ data: { alias: otherAlias, firstName: "Auth", lastName: "Other", role: "STANDARD", passwordHash: otherHash } });
    const adminHash = await hashPassword(DEMO_PASSWORDS.demoadm);
    await prisma.user.upsert({
      where: { alias: "demoadm" },
      update: { passwordHash: adminHash },
      create: { alias: "demoadm", firstName: "Demo", lastName: "Admin", role: "ADMIN", passwordHash: adminHash },
    });
  });

  after(async () => {
    await assertConnectedTestDatabase(readCurrentDatabase);
    const prefix = assertCleanupPrefix(PREFIX);
    await prisma.account.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { alias: { in: [ownerAlias, otherAlias] } } });
    await prisma.$disconnect();
  });

  it("does not accept the demo header, an unknown alias, or an unsigned cookie", async () => {
    const beforeCount = await prisma.user.count();
    const header = await listUsers(new Request("http://127.0.0.1/api/users", { headers: { "x-crm-lab-user": "demoadm" } }));
    assert.equal(header.status, 401);
    const unknown = await listUsers(new Request("http://127.0.0.1/api/users", { headers: { "x-crm-lab-user": "nobody" } }));
    assert.equal(unknown.status, 401);
    const unsigned = await listUsers(new Request("http://127.0.0.1/api/users", { headers: { cookie: "crm-lab-user=demoadm" } }));
    assert.equal(unsigned.status, 401);
    const forged = await listUsers(new Request("http://127.0.0.1/api/users", { headers: { cookie: `${SESSION_COOKIE}=not-a-session` } }));
    assert.equal(forged.status, 401);
    assert.equal(await prisma.user.count(), beforeCount);
    const nobody = await prisma.user.findUnique({ where: { alias: "nobody" } });
    assert.equal(nobody, null);
  });

  it("signs in with a password and refuses a standard user who is not the owner", async () => {
    const wrong = await login(new Request("http://127.0.0.1/api/auth/login", { method: "POST", body: JSON.stringify({ alias: ownerAlias, password: "nope" }) }));
    assert.equal(wrong.status, 401);

    const signedIn = await login(
      new Request("http://127.0.0.1/api/auth/login", { method: "POST", body: JSON.stringify({ alias: ownerAlias, password: "owner-pass" }) }),
    );
    assert.equal(signedIn.status, 200);
    const ownerCookie = cookieOf(signedIn);

    const created = await createAccount(
      new Request("http://127.0.0.1/api/accounts", {
        method: "POST",
        headers: { cookie: ownerCookie, "content-type": "application/json" },
        body: JSON.stringify({ name: `${PREFIX}${stamp}`, phone: "+1 555 0101" }),
      }),
    );
    assert.equal(created.status, 201);
    const account = (await created.json()) as { id: string; phone: string };
    assert.equal(account.phone, "+1 555 0101");

    const otherLogin = await login(
      new Request("http://127.0.0.1/api/auth/login", { method: "POST", body: JSON.stringify({ alias: otherAlias, password: "other-pass" }) }),
    );
    const otherCookie = cookieOf(otherLogin);
    const denied = await updateAccount(
      new Request(`http://127.0.0.1/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { cookie: otherCookie, "content-type": "application/json" },
        body: JSON.stringify({ phone: "+1 555 0188" }),
      }),
      { params: Promise.resolve({ id: account.id }) },
    );
    assert.equal(denied.status, 403);
    const stored = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
    assert.equal(stored.phone, "+1 555 0101");

    const owner = await prisma.user.findUniqueOrThrow({ where: { alias: ownerAlias } });
    const tampered = signSession("missing-user");
    const missing = await listUsers(new Request("http://127.0.0.1/api/users", { headers: { cookie: `${SESSION_COOKIE}=${tampered}` } }));
    assert.equal(missing.status, 401);
    assert.equal(owner.id === stored.ownerId, true);
  });
});

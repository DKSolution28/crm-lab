import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORDS } from "../src/lib/auth/password";
import { assertTestDatabaseUrl, E2E_PORT } from "../tests/test-database";
import { ensureDemoUsers, login, loginThroughTheForm } from "./helpers/session";

const origin = `http://127.0.0.1:${E2E_PORT}`;

test.describe.configure({ mode: "serial" });

test("the sign-in form creates a session", async ({ page }) => {
  test.setTimeout(60_000);
  await ensureDemoUsers();
  await loginThroughTheForm(page, "demoadm");
  await expect(page).toHaveURL(/\/accounts/);
});

test("unsigned identity is rejected and a signed standard user cannot edit someone else's account", async ({ page }) => {
  await ensureDemoUsers();
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  const before = await db.user.count();
  // fetch hors navigateur : le storageState Playwright du projet ne part pas avec la requête.
  const anonymous = await fetch(`${origin}/api/accounts`);
  expect(anonymous.status).toBe(401);
  const header = await fetch(`${origin}/api/users`, { headers: { "x-crm-lab-user": "demoadm" } });
  expect(header.status).toBe(401);
  const unknown = await fetch(`${origin}/api/users`, { headers: { "x-crm-lab-user": "nobody" } });
  expect(unknown.status).toBe(401);
  expect(await db.user.count()).toBe(before);
  expect(await db.user.findUnique({ where: { alias: "nobody" } })).toBeNull();

  const bad = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ alias: "demostd", password: "wrong-pass" }),
  });
  expect(bad.status).toBe(401);

  const admin = await db.user.findUniqueOrThrow({ where: { alias: "demoadm" } });
  const account = await db.account.create({
    data: {
      name: `[e2e] Auth owned ${Date.now()}`,
      phone: "+1 555 0101",
      ownerId: admin.id,
      createdById: admin.id,
      lastModifiedById: admin.id,
    },
  });

  await login(page, "demostd");
  const denied = await page.request.patch(`/api/accounts/${account.id}`, { data: { phone: "+1 555 0188" } });
  expect(denied.status()).toBe(403);
  const stored = await db.account.findUniqueOrThrow({ where: { id: account.id } });
  expect(stored.phone).toBe("+1 555 0101");

  await login(page, "demoadm");
  const allowed = await page.request.patch(`/api/accounts/${account.id}`, { data: { phone: "+1 555 0177" } });
  expect(allowed.status()).toBe(200);
  expect((await allowed.json()).phone).toBe("+1 555 0177");

  await db.account.delete({ where: { id: account.id } });
  await db.$disconnect();
  expect(DEMO_PASSWORDS.demoadm.length).toBeGreaterThan(0);
});

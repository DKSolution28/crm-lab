import { expect, test } from "@playwright/test";
import { E2E_PREFIX, cleanupE2eRecords, testDatabase } from "./helpers/db";
import { assertTestDatabaseUrl, databaseNameOf } from "../tests/test-database";

const prefix = `${E2E_PREFIX}ISO `;

test.afterAll(async () => {
  await cleanupE2eRecords(prefix);
});

test("Playwright and the Next server use the same disposable database", async ({ request }) => {
  const expected = databaseNameOf(assertTestDatabaseUrl());
  expect(expected).not.toBe("crm_lab");

  const db = await testDatabase();
  const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  expect(rows[0]?.name).toBe(expected);

  const directUsers = await db.user.findMany({ where: { alias: "demoadm" }, select: { id: true } });
  const apiUsers = await request.get("/api/users", { headers: { "x-crm-lab-user": "demoadm" } });
  expect(apiUsers.status()).toBe(200);
  expect((await apiUsers.json()).current.id).toBe(directUsers[0]?.id);

  const marker = `${prefix}same-database ${Date.now()}`;
  const created = await db.account.create({
    data: {
      name: marker,
      ownerId: directUsers[0]!.id,
      createdById: directUsers[0]!.id,
      lastModifiedById: directUsers[0]!.id,
    },
    select: { id: true },
  });

  const listed = await request.get(`/api/accounts?view=AllAccounts&q=${encodeURIComponent(marker)}`, { headers: { "x-crm-lab-user": "demoadm" } });
  expect(listed.ok()).toBe(true);
  const items = (await listed.json()).items as Array<{ id: string }>;
  expect(items.map((item) => item.id)).toContain(created.id);
});

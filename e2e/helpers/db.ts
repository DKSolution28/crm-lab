import { PrismaClient } from "@prisma/client";
import { assertCleanupPrefix, assertConnectedTestDatabase, assertTestDatabaseUrl } from "../../tests/test-database";

export const E2E_PREFIX = "[e2e] ";

let client: PrismaClient | null = null;

const currentDatabase = async (db: PrismaClient) => {
  const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  return rows[0]?.name ?? "";
};

/** Client Prisma branché exclusivement sur TEST_DATABASE_URL. */
export const testDatabase = async () => {
  if (!client) {
    const created = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
    try {
      await assertConnectedTestDatabase(() => currentDatabase(created));
    } catch (error) {
      await created.$disconnect();
      throw error;
    }
    client = created;
  }
  return client;
};

/** Supprime les enregistrements créés par les tests E2E. Refuse crm_lab et toute autre base. */
export const cleanupE2eRecords = async (prefix: string = E2E_PREFIX) => {
  const scoped = assertCleanupPrefix(prefix);
  const db = await testDatabase();
  await assertConnectedTestDatabase(() => currentDatabase(db));
  await db.account.deleteMany({ where: { name: { startsWith: scoped } } });
  await db.listView.deleteMany({ where: { label: { startsWith: scoped } } });
  await db.$disconnect();
  client = null;
};

export const seededUsers = async () => {
  const db = await testDatabase();
  const users = await db.user.findMany({ where: { alias: { in: ["demoadm", "demostd"] } }, select: { id: true, alias: true, role: true } });
  await db.$disconnect();
  client = null;
  return users;
};

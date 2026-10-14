import { PrismaClient } from "@prisma/client";

export const E2E_PREFIX = "[e2e] ";

const url = process.env.DATABASE_URL ?? "postgresql://ubuntu@127.0.0.1:5432/crm_lab";

let client: PrismaClient | null = null;

const prisma = () => {
  client ??= new PrismaClient({ datasourceUrl: url });
  return client;
};

/** Supprime les enregistrements créés par les tests E2E (préfixe « [e2e] » ou préfixe propre à la spec). */
export const cleanupE2eRecords = async (prefix: string = E2E_PREFIX) => {
  const db = prisma();
  await db.account.deleteMany({ where: { name: { startsWith: prefix } } });
  await db.listView.deleteMany({ where: { label: { startsWith: prefix } } });
  await db.$disconnect();
  client = null;
};

export const seededUsers = async () => {
  const db = prisma();
  const users = await db.user.findMany({ where: { alias: { in: ["demoadm", "demostd"] } }, select: { id: true, alias: true, role: true } });
  await db.$disconnect();
  client = null;
  return users;
};

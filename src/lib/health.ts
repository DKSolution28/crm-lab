import { prisma } from "@/lib/prisma";

export type HealthPayload = {
  ok: boolean;
  node: string;
  nextRuntime: string;
  databaseConfigured: boolean;
  databaseReachable: boolean;
  noteCount: number | null;
};

export async function getHealth(): Promise<HealthPayload> {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let databaseReachable = false;
  let noteCount: number | null = null;

  if (databaseConfigured) {
    try {
      noteCount = await prisma.labNote.count();
      databaseReachable = true;
    } catch {
      databaseReachable = false;
      noteCount = null;
    }
  }

  return {
    ok: databaseReachable,
    node: process.version,
    nextRuntime: process.release.name,
    databaseConfigured,
    databaseReachable,
    noteCount,
  };
}

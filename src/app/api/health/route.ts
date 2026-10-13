import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health endpoint used by scripts/cloud/start.sh, scripts/cloud/verify.sh and
// the Playwright smoke test. Reports process + database reachability.
export async function GET() {
  const startedAt = Date.now();
  let database: { ok: boolean; error?: string } = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true };
  } catch (error) {
    database = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const body = {
    ok: database.ok,
    service: "crm-lab",
    node: process.version,
    database,
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: database.ok ? 200 : 503 });
}

import { connection } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const prisma = getPrisma();
    const [accounts, contacts, opportunities] = await Promise.all([
      prisma.account.count(),
      prisma.contact.count(),
      prisma.opportunity.count(),
    ]);
    return Response.json({
      status: "ok",
      database: "up",
      counts: { accounts, contacts, opportunities },
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "down",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

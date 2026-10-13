import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now() AS now`;
    const projects = await prisma.project.count();
    return Response.json({ status: "ok", database: "up", projects, now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ status: "error", database: "down", message }, { status: 503 });
  }
}

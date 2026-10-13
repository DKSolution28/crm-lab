import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "crm-lab",
    status: "ok",
    database: "postgresql-via-prisma",
  });
}

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard/service";
import { getRequestUser } from "@/lib/auth/current-user";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/dashboard — agrégats globaux, sans filtre et sans écriture.
export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    return NextResponse.json(await getDashboard());
  } catch (error) {
    return errorResponse(error);
  }
}

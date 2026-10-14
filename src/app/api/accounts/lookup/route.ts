import { NextResponse } from "next/server";
import { lookupAccounts } from "@/lib/accounts/service";
import { errorResponse } from "@/lib/http";

// GET /api/accounts/lookup?q=nor&exclude=<id>  — suggestions pour le lookup Parent Account
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const items = await lookupAccounts(params.get("q") ?? "", params.get("exclude"));
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { convertLead } from "@/lib/leads/convert";
import { errorResponse, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// POST /api/leads/:id/convert  { createOpportunity, accountName?, opportunity? }
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const result = await convertLead(id, await readJson(request), user);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

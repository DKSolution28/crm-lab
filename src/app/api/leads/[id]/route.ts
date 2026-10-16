import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { getLead, updateLead } from "@/lib/leads/service";
import { recordRecentView } from "@/lib/recent/service";
import { errorResponse, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const lead = await getLead(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    await recordRecentView("Lead", lead.id, user);
    return NextResponse.json({ ...lead, canEdit: canEditRecord(user, lead) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const lead = await updateLead(id, await readJson(request), user);
    return NextResponse.json(lead);
  } catch (error) {
    return errorResponse(error);
  }
}

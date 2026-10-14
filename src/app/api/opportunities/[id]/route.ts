import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { errorResponse, readJson } from "@/lib/http";
import { recordRecentView } from "@/lib/recent/service";
import { getOpportunity, updateOpportunity } from "@/lib/opportunities/service";
import { opportunityInputFromJson } from "@/lib/opportunities/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const opportunity = await getOpportunity(id);
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    await recordRecentView("Opportunity", opportunity.id, user);
    return NextResponse.json({ ...opportunity, canEdit: canEditRecord(user, opportunity) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const existing = await getOpportunity(id);
    if (!existing) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    const body = (await readJson(request)) as Record<string, unknown>;
    const merged = {
      name: existing.name,
      stageName: existing.stageName,
      amount: existing.amount,
      closeDate: existing.closeDate,
      probability: existing.probability,
      accountId: existing.accountId,
      primaryContactId: existing.primaryContactId,
      ownerId: existing.ownerId,
      ...body,
    };
    const opportunity = await updateOpportunity(id, opportunityInputFromJson(merged), user);
    return NextResponse.json(opportunity);
  } catch (error) {
    return errorResponse(error);
  }
}

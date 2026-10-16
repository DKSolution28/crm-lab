import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { createView, listVisibleViews } from "@/lib/accounts/list-views";
import { errorResponse, readJson } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const views = await listVisibleViews(user);
    return NextResponse.json({ items: views, pinnedId: user.pinnedAccountViewId });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/list-views { label, visibility?, scope?, columns? }
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const view = await createView({ label: body.label, visibility: body.visibility, scope: body.scope, columns: body.columns }, user);
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

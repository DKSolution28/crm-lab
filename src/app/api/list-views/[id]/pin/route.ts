import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { findView, pinView } from "@/lib/accounts/list-views";
import { errorResponse } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

// POST /api/list-views/:id/pin — épingle la vue pour l'utilisateur courant
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const view = await findView(id, user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    await pinView(view.id, user);
    return NextResponse.json({ pinnedId: view.id });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import {
  cloneView,
  deleteView,
  findView,
  renameView,
  setViewColumns,
  setViewFilters,
  setViewSort,
  setViewVisibility,
  updateView,
} from "@/lib/accounts/list-views";
import { errorResponse, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const view = await findView(id, user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    return NextResponse.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/list-views/:id  { label? , visibility?, columns?, filters?, filterLogic?, sortField?, sortDirection? }
export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const body = (await readJson(request)) as Record<string, unknown>;
    const view = await findView(id, user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    const updated = await updateView(view.id, body, user);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/list-views/:id  { action: "clone", label }
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const body = (await readJson(request)) as Record<string, unknown>;
    if (body.action !== "clone") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    const source = await findView(id, user);
    if (!source) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    const view = await cloneView(source.id, body.label, user);
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const view = await findView(id, user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    await deleteView(view.id, user);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

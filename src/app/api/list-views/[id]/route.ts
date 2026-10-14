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
    let view = await findView(id, user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    if (body.label !== undefined) view = await renameView(view.id, body.label, user);
    if (body.visibility !== undefined) view = await setViewVisibility(view.id, body.visibility, user);
    if (body.columns !== undefined) view = await setViewColumns(view.id, body.columns, user);
    if (body.filters !== undefined || body.filterLogic !== undefined) {
      view = await setViewFilters(view.id, body.filters ?? view.filters, body.filterLogic ?? view.filterLogic, user);
    }
    if (body.sortField !== undefined) view = await setViewSort(view.id, body.sortField, body.sortDirection, user);
    return NextResponse.json(view);
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

import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { findView, resolveDefaultView } from "@/lib/accounts/list-views";
import { createAccount, listAccounts } from "@/lib/accounts/service";
import { accountInputFromJson } from "@/lib/accounts/validation";
import { errorResponse, readJson } from "@/lib/http";

// GET /api/accounts?view=AllAccounts&q=&sort=name&dir=asc&page=1&pageSize=50
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const params = new URL(request.url).searchParams;
    const viewParam = params.get("view");
    const view = viewParam ? await findView(viewParam, user) : await resolveDefaultView(user);
    if (!view) return NextResponse.json({ error: "List view not found" }, { status: 404 });
    const result = await listAccounts(view, user, {
      q: params.get("q"),
      sortField: params.get("sort"),
      sortDirection: params.get("dir") === "desc" ? "desc" : params.get("dir") === "asc" ? "asc" : null,
      page: Number(params.get("page") ?? 1) || 1,
      pageSize: Number(params.get("pageSize") ?? 50) || 50,
    });
    return NextResponse.json({ view: { id: view.id, developerName: view.developerName, label: view.label, columns: view.columns }, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/accounts  { name, type, industry, billingCountryCode, ... }
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const body = await readJson(request);
    const account = await createAccount(accountInputFromJson(body), user);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

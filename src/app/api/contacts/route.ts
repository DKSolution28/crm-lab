import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { createContact, listContacts } from "@/lib/contacts/service";
import { contactInputFromJson } from "@/lib/contacts/validation";
import { errorResponse, readJson } from "@/lib/http";

// GET /api/contacts?q=&sort=lastName&dir=asc&page=1&pageSize=50&scope=all&filters=&filterLogic=
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const params = new URL(request.url).searchParams;
    const result = await listContacts(user, {
      q: params.get("q"),
      sortField: params.get("sort"),
      sortDirection: params.get("dir") === "desc" ? "desc" : params.get("dir") === "asc" ? "asc" : null,
      page: Number(params.get("page") ?? 1) || 1,
      pageSize: Number(params.get("pageSize") ?? 50) || 50,
      scope: params.get("scope"),
      filters: params.get("filters"),
      filterLogic: params.get("filterLogic"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/contacts
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const contact = await createContact(contactInputFromJson(await readJson(request)), user);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

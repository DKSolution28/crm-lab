import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { lookupContacts } from "@/lib/contacts/service";
import { errorResponse } from "@/lib/http";

// GET /api/contacts/lookup?q=&exclude=
export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    const params = new URL(request.url).searchParams;
    const items = await lookupContacts(params.get("q") ?? "", params.get("exclude"));
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

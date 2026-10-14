import { NextResponse } from "next/server";
import { lookupContacts } from "@/lib/contacts/service";
import { errorResponse } from "@/lib/http";

// GET /api/contacts/lookup?q=&exclude=
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const items = await lookupContacts(params.get("q") ?? "", params.get("exclude"));
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

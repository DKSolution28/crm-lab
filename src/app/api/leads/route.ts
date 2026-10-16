import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { readLeadListQuery } from "@/lib/leads/filters";
import { createLead, listLeads } from "@/lib/leads/service";
import { errorResponse, readJson } from "@/lib/http";

// GET /api/leads?q=&sort=lastName&dir=asc&page=1&pageSize=50&scope=all&filters=&filterLogic=
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const query = readLeadListQuery(new URL(request.url).searchParams);
    const result = await listLeads(user, query);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/leads  { lastName, company, status?, qualified?, ownerId? }
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const lead = await createLead(await readJson(request), user);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

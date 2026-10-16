import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { errorResponse, readJson } from "@/lib/http";
import { parseFiltersQuery } from "@/lib/opportunities/filters";
import { createOpportunity, listOpportunities } from "@/lib/opportunities/service";
import { opportunityInputFromJson } from "@/lib/opportunities/validation";

// GET /api/opportunities?q=&sort=closeDate&dir=asc&page=1&pageSize=50&scope=all&display=table&filters=
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const params = new URL(request.url).searchParams;
    const display = params.get("display");
    const result = await listOpportunities(user, {
      q: params.get("q"),
      sortField: params.get("sort"),
      sortDirection: params.get("dir"),
      page: Number(params.get("page") ?? 1) || 1,
      pageSize: display === "kanban" ? 200 : Number(params.get("pageSize") ?? 50) || 50,
      scope: params.get("scope"),
      filters: parseFiltersQuery(params.get("filters")),
      filterLogic: params.get("filterLogic"),
      display,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/opportunities
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const opportunity = await createOpportunity(opportunityInputFromJson(await readJson(request)), user);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

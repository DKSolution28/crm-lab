import { NextResponse } from "next/server";
import { ACCOUNT_FIELDS } from "@/lib/accounts/fields";
import { FILTER_OPERATORS } from "@/lib/accounts/filters";
import { COUNTRY_OPTIONS, PICKLISTS } from "@/lib/accounts/picklists";

// GET /api/picklists — valeurs de picklist, pays/états et métadonnées de champs
export async function GET() {
  return NextResponse.json({
    picklists: PICKLISTS,
    countries: COUNTRY_OPTIONS,
    operators: FILTER_OPERATORS,
    fields: ACCOUNT_FIELDS,
  });
}

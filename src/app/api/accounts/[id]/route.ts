import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { canEditAccount } from "@/lib/auth/policies";
import { getAccountWithRelated, recordView, updateAccount } from "@/lib/accounts/service";
import { accountInputFromJson } from "@/lib/accounts/validation";
import { errorResponse, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const account = await getAccountWithRelated(id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    await recordView(account.id, user);
    return NextResponse.json({ ...account, canEdit: canEditAccount(user, account) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const existing = await getAccountWithRelated(id);
    if (!existing) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const body = (await readJson(request)) as Record<string, unknown>;
    // PATCH partiel : les champs absents conservent leur valeur courante.
    const merged: Record<string, unknown> = {
      name: existing.name,
      accountNumber: existing.accountNumber,
      site: existing.site,
      accountSource: existing.accountSource,
      annualRevenue: existing.annualRevenue,
      type: existing.type,
      industry: existing.industry,
      ownership: existing.ownership,
      rating: existing.rating,
      description: existing.description,
      website: existing.website,
      tickerSymbol: existing.tickerSymbol,
      sic: existing.sic,
      sicDesc: existing.sicDesc,
      jigsaw: existing.jigsaw,
      tier: existing.tier,
      numberOfEmployees: existing.numberOfEmployees,
      isBuyer: existing.isBuyer,
      isCustomerPortal: existing.isCustomerPortal,
      phone: existing.phone,
      fax: existing.fax,
      billingStreet: existing.billingStreet,
      billingCity: existing.billingCity,
      billingStateCode: existing.billingStateCode,
      billingPostalCode: existing.billingPostalCode,
      billingCountryCode: existing.billingCountryCode,
      shippingStreet: existing.shippingStreet,
      shippingCity: existing.shippingCity,
      shippingStateCode: existing.shippingStateCode,
      shippingPostalCode: existing.shippingPostalCode,
      shippingCountryCode: existing.shippingCountryCode,
      parentId: existing.parentId,
      ownerId: existing.ownerId,
      ...body,
    };
    const account = await updateAccount(id, accountInputFromJson(merged), user);
    return NextResponse.json(account);
  } catch (error) {
    return errorResponse(error);
  }
}

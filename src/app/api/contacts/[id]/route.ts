import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { getContact, updateContact } from "@/lib/contacts/service";
import { contactInputFromJson } from "@/lib/contacts/validation";
import { recordRecentView } from "@/lib/recent/service";
import { errorResponse, readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const contact = await getContact(id);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    await recordRecentView("Contact", contact.id, user);
    return NextResponse.json({ ...contact, canEdit: canEditRecord(user, contact) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const existing = await getContact(id);
    if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    const body = (await readJson(request)) as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      salutation: existing.salutation,
      firstName: existing.firstName,
      lastName: existing.lastName,
      title: existing.title,
      description: existing.description,
      phone: existing.phone,
      email: existing.email,
      accountId: existing.accountId,
      reportsToId: existing.reportsToId,
      mailingStreet: existing.mailingStreet,
      mailingCity: existing.mailingCity,
      mailingStateCode: existing.mailingStateCode,
      mailingPostalCode: existing.mailingPostalCode,
      mailingCountryCode: existing.mailingCountryCode,
      ownerId: existing.ownerId,
      ...body,
    };
    const contact = await updateContact(id, contactInputFromJson(merged), user);
    return NextResponse.json(contact);
  } catch (error) {
    return errorResponse(error);
  }
}

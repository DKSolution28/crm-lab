"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/auth/policies";
import { contactName } from "@/lib/contacts/format";
import { NotFoundError, createContact, updateContact } from "@/lib/contacts/service";
import { ValidationError, contactInputFromFormData, type FieldErrors } from "@/lib/contacts/validation";

export type ContactFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const formValues = (formData: FormData) => {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "intent") values[key] = value;
  }
  return values;
};

const toFormState = (error: unknown, formData: FormData): ContactFormState => {
  const values = formValues(formData);
  if (error instanceof ValidationError) return { ok: false, error: "Review the errors on this page.", fieldErrors: error.fieldErrors, values };
  if (error instanceof AuthorizationError || error instanceof NotFoundError) return { ok: false, error: error.message, values };
  console.error(error);
  return { ok: false, error: "The contact could not be saved. Try again.", values };
};

export async function createContactAction(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const user = await getCurrentUser();
  let created: { id: string; firstName: string | null; lastName: string; accountId: string | null };
  try {
    created = await createContact(contactInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/contacts");
  if (created.accountId) revalidatePath(`/accounts/${created.accountId}`);
  const name = contactName(created);
  const toast = encodeURIComponent(`success:Contact "${name}" was created.`);
  const intent = String(formData.get("intent") ?? "save");
  if (intent === "save-new") redirect(`/contacts/new?toast=${toast}`);
  redirect(`/contacts/${created.id}?toast=${toast}`);
}

export async function updateContactAction(id: string, _previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const user = await getCurrentUser();
  let updated: { id: string; firstName: string | null; lastName: string; accountId: string | null };
  try {
    updated = await updateContact(id, contactInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  if (updated.accountId) revalidatePath(`/accounts/${updated.accountId}`);
  redirect(`/contacts/${updated.id}?toast=${encodeURIComponent(`success:Contact "${contactName(updated)}" was saved.`)}`);
}

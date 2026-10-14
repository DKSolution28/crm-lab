"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/auth/policies";
import { NotFoundError } from "@/lib/accounts/service";
import { ConflictError } from "@/lib/errors";
import { leadDisplayName } from "@/lib/leads/format";
import { createLead, updateLead } from "@/lib/leads/service";
import { ValidationError, leadInputFromFormData, type FieldErrors } from "@/lib/leads/validation";

export type LeadFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const formValues = (formData: FormData) => {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
};

const toFormState = (error: unknown, formData: FormData): LeadFormState => {
  const values = formValues(formData);
  if (error instanceof ValidationError) return { ok: false, error: "Review the errors on this page.", fieldErrors: error.fieldErrors, values };
  if (error instanceof ConflictError || error instanceof AuthorizationError || error instanceof NotFoundError) {
    return { ok: false, error: error.message, values };
  }
  console.error(error);
  return { ok: false, error: "The lead could not be saved. Try again.", values };
};

export async function createLeadAction(_previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const user = await getCurrentUser();
  let created: { id: string; firstName: string | null; lastName: string };
  try {
    created = await createLead(leadInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/leads");
  const name = leadDisplayName(created);
  const intent = String(formData.get("intent") ?? "save");
  const toast = encodeURIComponent(`success:Lead "${name}" was created.`);
  if (intent === "save-new") redirect(`/leads/new?toast=${toast}`);
  redirect(`/leads/${created.id}?toast=${toast}`);
}

export async function updateLeadAction(id: string, _previous: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const user = await getCurrentUser();
  let updated: { id: string; firstName: string | null; lastName: string };
  try {
    updated = await updateLead(id, leadInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  const name = leadDisplayName(updated);
  redirect(`/leads/${updated.id}?toast=${encodeURIComponent(`success:Lead "${name}" was saved.`)}`);
}

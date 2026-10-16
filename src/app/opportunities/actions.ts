"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/auth/policies";
import { NotFoundError, createOpportunity, updateOpportunity } from "@/lib/opportunities/service";
import { ValidationError, opportunityInputFromFormData, type FieldErrors } from "@/lib/opportunities/validation";

export type OpportunityFormState = {
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

const toFormState = (error: unknown, formData: FormData): OpportunityFormState => {
  const values = formValues(formData);
  if (error instanceof ValidationError) return { ok: false, error: "Review the errors on this page.", fieldErrors: error.fieldErrors, values };
  if (error instanceof AuthorizationError || error instanceof NotFoundError) return { ok: false, error: error.message, values };
  console.error(error);
  return { ok: false, error: "The opportunity could not be saved. Try again.", values };
};

export async function createOpportunityAction(_previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const user = await getCurrentUser();
  let created: { id: string; name: string };
  try {
    created = await createOpportunity(opportunityInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/opportunities");
  const intent = String(formData.get("intent") ?? "save");
  const toast = encodeURIComponent(`success:Opportunity "${created.name}" was created.`);
  if (intent === "save-new") redirect(`/opportunities/new?toast=${toast}`);
  redirect(`/opportunities/${created.id}?toast=${toast}`);
}

export async function updateOpportunityAction(id: string, _previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  const user = await getCurrentUser();
  let updated: { id: string; name: string };
  try {
    updated = await updateOpportunity(id, opportunityInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  redirect(`/opportunities/${updated.id}?toast=${encodeURIComponent(`success:Opportunity "${updated.name}" was saved.`)}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/auth/policies";
import { FilterError } from "@/lib/accounts/filters";
import {
  ListViewError,
  cloneView,
  createView,
  deleteView,
  pinView,
  renameView,
  setViewColumns,
  setViewFilters,
  setViewSort,
  setViewVisibility,
} from "@/lib/accounts/list-views";
import { NotFoundError, createAccount, updateAccount } from "@/lib/accounts/service";
import { ValidationError, accountInputFromFormData, type FieldErrors } from "@/lib/accounts/validation";

export type AccountFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  /** Valeurs soumises, pour ré-afficher le formulaire après une erreur. */
  values?: Record<string, string>;
};

export type ActionResult = { ok: true; id?: string; label?: string } | { ok: false; error: string };

const formValues = (formData: FormData) => {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
};

const toFormState = (error: unknown, formData: FormData): AccountFormState => {
  const values = formValues(formData);
  if (error instanceof ValidationError) return { ok: false, fieldErrors: error.fieldErrors, error: "Review the errors on this page.", values };
  if (error instanceof AuthorizationError || error instanceof NotFoundError) return { ok: false, error: error.message, values };
  console.error(error);
  return { ok: false, error: "The account could not be saved. Try again.", values };
};

export async function createAccountAction(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getCurrentUser();
  let created: { id: string; name: string };
  try {
    created = await createAccount(accountInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/accounts");
  const intent = String(formData.get("intent") ?? "save");
  const toast = encodeURIComponent(`success:Account "${created.name}" was created.`);
  if (intent === "save-new") redirect(`/accounts/new?toast=${toast}`);
  redirect(`/accounts/${created.id}?toast=${toast}`);
}

export async function updateAccountAction(id: string, _previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getCurrentUser();
  let updated: { id: string; name: string };
  try {
    updated = await updateAccount(id, accountInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect(`/accounts/${updated.id}?toast=${encodeURIComponent(`success:Account "${updated.name}" was saved.`)}`);
}

const run = async (fn: () => Promise<ActionResult>): Promise<ActionResult> => {
  try {
    const result = await fn();
    revalidatePath("/accounts");
    return result;
  } catch (error) {
    if (error instanceof ListViewError || error instanceof FilterError || error instanceof AuthorizationError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "The operation failed. Try again." };
  }
};

export async function createViewAction(input: { label: string; visibility: "PRIVATE" | "EVERYONE"; scope: "ALL" | "MINE" }) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await createView(input, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function cloneViewAction(sourceId: string, label: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await cloneView(sourceId, label, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function renameViewAction(id: string, label: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await renameView(id, label, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function setVisibilityAction(id: string, visibility: "PRIVATE" | "EVERYONE") {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await setViewVisibility(id, visibility, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function setColumnsAction(id: string, columns: string[]) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await setViewColumns(id, columns, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function setSortAction(id: string, sortField: string, sortDirection: "asc" | "desc") {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await setViewSort(id, sortField, sortDirection, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function saveFiltersAction(id: string, filters: unknown, filterLogic: string | null) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await setViewFilters(id, filters, filterLogic, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

export async function deleteViewAction(id: string) {
  return run(async () => {
    const user = await getCurrentUser();
    await deleteView(id, user);
    return { ok: true };
  });
}

export async function pinViewAction(id: string) {
  return run(async () => {
    const user = await getCurrentUser();
    const view = await pinView(id, user);
    return { ok: true, id: view.id, label: view.label };
  });
}

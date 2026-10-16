"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AuthorizationError } from "@/lib/auth/policies";
import { NotFoundError } from "@/lib/accounts/service";
import { UnknownParentError, createTask, parentPathname, parentRecordHref, updateTask, type TaskDto } from "@/lib/activities/service";
import { ParentRequiredError, ValidationError, taskInputFromFormData, type FieldErrors } from "@/lib/activities/validation";

export type TaskFormState = {
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

const toFormState = (error: unknown, formData: FormData): TaskFormState => {
  const values = formValues(formData);
  if (error instanceof ValidationError || error instanceof UnknownParentError) {
    return { ok: false, error: "Review the errors on this page.", fieldErrors: error.fieldErrors, values };
  }
  if (error instanceof ParentRequiredError || error instanceof AuthorizationError || error instanceof NotFoundError) {
    return { ok: false, error: error.message, values };
  }
  console.error(error);
  return { ok: false, error: "The task could not be saved. Try again.", values };
};

const finish = (task: TaskDto, message: string): never => {
  const href = parentRecordHref(task.parent);
  revalidatePath(parentPathname(task.parent));
  redirect(`${href}${href.includes("?") ? "&" : "?"}toast=${encodeURIComponent(message)}`);
};

export async function createTaskAction(_previous: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await getCurrentUser();
  let created: TaskDto;
  try {
    created = await createTask(taskInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  return finish(created, `success:Task "${created.subject}" was created.`);
}

export async function updateTaskAction(id: string, _previous: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await getCurrentUser();
  let updated: TaskDto;
  try {
    updated = await updateTask(id, taskInputFromFormData(formData), user);
  } catch (error) {
    return toFormState(error, formData);
  }
  return finish(updated, `success:Task "${updated.subject}" was saved.`);
}

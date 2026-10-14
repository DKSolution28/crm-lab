// Validation des tâches. Le sujet est requis. Une tâche a exactement un parent,
// reçu comme discriminant `parent`, jamais comme quatre clés étrangères.
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { FilterError } from "../accounts/filters";
import { REQUIRED_MESSAGE, ValidationError, type FieldErrors } from "../accounts/validation";
import { isParentType, isTaskPriority, isTaskStatus, type ParentType } from "./picklists";

export { REQUIRED_MESSAGE, ValidationError };
export type { FieldErrors };

export const PARENT_NOT_FOUND_MESSAGE = "The related record was not found.";
export const PARENT_REQUIRED_MESSAGE = "A parent record is required.";
export const EXACTLY_ONE_PARENT_MESSAGE = "A task has exactly one parent.";
export const PARENT_LOCKED_MESSAGE = "The parent cannot be changed.";
export const DUE_DATE_MESSAGE = "Enter a due date as YYYY-MM-DD.";

const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PARENT_KEYS = [
  ["accountId", "Account"],
  ["contactId", "Contact"],
  ["leadId", "Lead"],
  ["opportunityId", "Opportunity"],
] as const;

export class ParentRequiredError extends FilterError {
  constructor() {
    super(PARENT_REQUIRED_MESSAGE);
    this.name = "ParentRequiredError";
  }
}

export type ParentRef = { type: ParentType; id: string };

export type ParentColumns = {
  accountId: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
};

export type TaskFieldInput = {
  subject?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  assigneeId?: unknown;
  ownerId?: unknown;
};

export type ValidatedTaskFields = {
  subject: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
  ownerId: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalId = (value: unknown): string | null => text(value);

export const parentColumns = (parent: ParentRef): ParentColumns => ({
  accountId: parent.type === "Account" ? parent.id : null,
  contactId: parent.type === "Contact" ? parent.id : null,
  leadId: parent.type === "Lead" ? parent.id : null,
  opportunityId: parent.type === "Opportunity" ? parent.id : null,
});

export const parentColumnCount = (columns: ParentColumns): number =>
  [columns.accountId, columns.contactId, columns.leadId, columns.opportunityId].filter((id) => id).length;

/** Garde appelée immédiatement avant l'insert. Zéro ou plusieurs parents n'écrivent rien. */
export const assertSingleParentColumns = (columns: ParentColumns) => {
  if (parentColumnCount(columns) !== 1) throw new ValidationError({ parent: EXACTLY_ONE_PARENT_MESSAGE });
};

const addRef = (refs: ParentRef[], type: unknown, id: unknown, incoherent: { value: boolean }) => {
  if (typeof type !== "string" || !isParentType(type) || typeof id !== "string" || !id.trim()) {
    incoherent.value = true;
    return;
  }
  const next = { type, id: id.trim() };
  if (!refs.some((ref) => ref.type === next.type && ref.id === next.id)) refs.push(next);
};

export type CollectedParents = { refs: ParentRef[]; incoherent: boolean };

/** Lit `parent` et, s'ils sont présents, les quatre clés. Deux cibles distinctes restent deux parents. */
export const collectParentRefs = (input: unknown): CollectedParents => {
  const refs: ParentRef[] = [];
  const incoherent = { value: false };
  if (!isRecord(input)) return { refs, incoherent: true };
  if ("parent" in input) {
    const parent = input.parent;
    if (Array.isArray(parent)) {
      if (parent.length === 0) incoherent.value = true;
      for (const item of parent) {
        if (!isRecord(item)) incoherent.value = true;
        else addRef(refs, item.type, item.id, incoherent);
      }
    } else if (isRecord(parent)) {
      addRef(refs, parent.type, parent.id, incoherent);
    } else if (parent !== null && parent !== undefined) {
      incoherent.value = true;
    } else {
      incoherent.value = true;
    }
  }
  for (const [key, type] of PARENT_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value === null || value === undefined || value === "") continue;
    addRef(refs, type, value, incoherent);
  }
  return { refs, incoherent: incoherent.value };
};

export const mentionsParent = (input: unknown): boolean => {
  if (!isRecord(input)) return false;
  return "parent" in input || PARENT_KEYS.some(([key]) => key in input);
};

const parseDueDate = (value: unknown, errors: FieldErrors): Date | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DUE_DATE_PATTERN.test(value.trim())) {
    errors.dueDate = DUE_DATE_MESSAGE;
    return null;
  }
  const match = DUE_DATE_PATTERN.exec(value.trim());
  if (!match) {
    errors.dueDate = DUE_DATE_MESSAGE;
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    errors.dueDate = DUE_DATE_MESSAGE;
    return null;
  }
  return date;
};

export const applyParentExistence = (errors: FieldErrors, exists: boolean): FieldErrors => {
  if (!exists) errors.parent = PARENT_NOT_FOUND_MESSAGE;
  return errors;
};

export const validateTaskFields = (input: TaskFieldInput, options: { applyDefaults: boolean }): { data: ValidatedTaskFields; errors: FieldErrors } => {
  const errors: FieldErrors = {};
  const subject = text(input.subject);
  if (!subject) errors.subject = REQUIRED_MESSAGE;
  else if (subject.length > 255) errors.subject = "Maximum length is 255 characters.";

  const description = text(input.description);
  if (description && description.length > 32000) errors.description = "Maximum length is 32000 characters.";

  const statusText = text(input.status);
  let status: TaskStatus = "NotStarted";
  if (!statusText) {
    if (!options.applyDefaults) errors.status = REQUIRED_MESSAGE;
  } else if (!isTaskStatus(statusText)) {
    errors.status = `"${statusText}" is not a valid Status value.`;
  } else {
    status = statusText;
  }

  const priorityText = text(input.priority);
  let priority: TaskPriority = "Normal";
  if (!priorityText) {
    if (!options.applyDefaults) errors.priority = REQUIRED_MESSAGE;
  } else if (!isTaskPriority(priorityText)) {
    errors.priority = `"${priorityText}" is not a valid Priority value.`;
  } else {
    priority = priorityText;
  }

  const dueDate = parseDueDate(input.dueDate, errors);
  const data: ValidatedTaskFields = {
    subject: subject ?? "",
    description,
    status,
    priority,
    dueDate,
    assigneeId: optionalId(input.assigneeId),
    ownerId: optionalId(input.ownerId),
  };
  return { data, errors };
};

const FIELD_KEYS = ["subject", "description", "status", "priority", "dueDate", "assigneeId", "ownerId"] as const;

export const taskInputFromFormData = (formData: FormData): Record<string, unknown> => {
  const input: Record<string, unknown> = {};
  for (const key of FIELD_KEYS) {
    if (!formData.has(key)) continue;
    input[key] = String(formData.get(key) ?? "");
  }
  if (formData.has("parentType") || formData.has("parentId")) {
    input.parent = { type: String(formData.get("parentType") ?? ""), id: String(formData.get("parentId") ?? "") };
  }
  return input;
};

export const isTaskRecord = isRecord;

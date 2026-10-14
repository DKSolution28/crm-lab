// Validation des saisies Lead. lastName et company sont requis. Le statut
// Converted et les colonnes de conversion ne s'écrivent pas par ce chemin.
import { REQUIRED_MESSAGE, ValidationError, type FieldErrors } from "../accounts/validation";

export { REQUIRED_MESSAGE, ValidationError, type FieldErrors };

export const CONVERT_ACTION_MESSAGE = "Convert the lead with the convert action.";
export const UNQUALIFIED_MESSAGE = "An unqualified lead cannot be qualified.";

/** Statuts qu'un PATCH peut poser. Converted est réservé à la conversion. */
export const LEAD_PATCH_STATUSES = ["New", "Working", "Unqualified"] as const;
export type LeadPatchStatus = (typeof LEAD_PATCH_STATUSES)[number];

export const LEAD_STATUS_VALUES = ["New", "Working", "Unqualified", "Converted"] as const;

export const CONVERT_ONLY_KEYS = ["convertedAt", "convertedAccountId", "convertedContactId", "convertedOpportunityId"] as const;

const MAX_LENGTHS: Record<string, number> = {
  firstName: 80,
  lastName: 80,
  company: 255,
  title: 128,
  email: 255,
  phone: 40,
  description: 32000,
};

const PATCHABLE = new Set<string>(LEAD_PATCH_STATUSES);

export type LeadInput = {
  firstName?: unknown;
  lastName?: unknown;
  company?: unknown;
  title?: unknown;
  email?: unknown;
  phone?: unknown;
  description?: unknown;
  status?: unknown;
  qualified?: unknown;
  ownerId?: unknown;
};

export type ValidatedLead = {
  firstName: string | null;
  lastName: string;
  company: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  status: LeadPatchStatus;
  qualified: boolean;
  ownerId: string | null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const str = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const bool = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return false;
  return /^(true|on|1|yes)$/i.test(String(value));
};

/** Erreur de statut pour une écriture. Tout passage entre New, Working et Unqualified est permis. */
export const statusFieldError = (status: string | null): string | undefined => {
  if (!status) return undefined;
  if (status === "Converted") return CONVERT_ACTION_MESSAGE;
  if (!PATCHABLE.has(status)) return `"${status}" is not a valid Lead Status value.`;
  return undefined;
};

/** qualified true est incompatible avec le statut résultant Unqualified. */
export const qualifiedFieldError = (status: string, qualified: boolean): string | undefined =>
  qualified && status === "Unqualified" ? UNQUALIFIED_MESSAGE : undefined;

/** PATCH/POST qui tente d'écrire la conversion, y compris avec une valeur nulle. */
export const convertWriteErrors = (body: Record<string, unknown>): FieldErrors => {
  const status = typeof body.status === "string" ? body.status.trim() : body.status;
  const writesStatus = status === "Converted";
  const writesColumns = CONVERT_ONLY_KEYS.some((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (writesStatus || writesColumns) return { status: CONVERT_ACTION_MESSAGE };
  return {};
};

export const validateLeadInput = (input: LeadInput): { data: ValidatedLead; errors: FieldErrors } => {
  const errors: FieldErrors = {};
  const lastName = str(input.lastName);
  const company = str(input.company);
  if (!lastName) errors.lastName = REQUIRED_MESSAGE;
  if (!company) errors.company = REQUIRED_MESSAGE;

  const statusText = str(input.status);
  const statusError = statusFieldError(statusText);
  if (statusError) errors.status = statusError;
  const status: LeadPatchStatus = statusText === "Working" || statusText === "Unqualified" || statusText === "New" ? statusText : "New";
  const qualified = bool(input.qualified);
  if (!statusError) {
    const qualifiedError = qualifiedFieldError(status, qualified);
    if (qualifiedError) errors.qualified = qualifiedError;
  }

  const data: ValidatedLead = {
    firstName: str(input.firstName),
    lastName: lastName ?? "",
    company: company ?? "",
    title: str(input.title),
    email: str(input.email),
    phone: str(input.phone),
    description: str(input.description),
    status,
    qualified,
    ownerId: str(input.ownerId),
  };

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    const value = data[key as keyof ValidatedLead];
    if (typeof value === "string" && value.length > max && !errors[key]) {
      errors[key] = `Maximum length is ${max} characters.`;
    }
  }

  return { data, errors };
};

const EDITABLE_KEYS = ["firstName", "lastName", "company", "title", "email", "phone", "description", "status", "qualified", "ownerId"] as const;

export const leadInputFromJson = (body: unknown): LeadInput => {
  if (!isRecord(body)) return {};
  const input: LeadInput = {};
  for (const key of EDITABLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) input[key] = body[key];
  }
  return input;
};

export const leadInputFromFormData = (formData: FormData): LeadInput => {
  const get = (key: string) => {
    const value = formData.get(key);
    return value === null ? null : String(value);
  };
  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    company: get("company"),
    title: get("title"),
    email: get("email"),
    phone: get("phone"),
    description: get("description"),
    status: get("status"),
    qualified: formData.has("qualified") ? get("qualified") : false,
    ownerId: get("ownerId"),
  };
};

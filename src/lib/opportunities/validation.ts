// Saisie Opportunity. Le montant reste une chaîne décimale : un nombre JSON
// est refusé avant toute conversion qui passerait par Number.
import type { OpportunityStage } from "@prisma/client";
import { REQUIRED_MESSAGE, ValidationError, type FieldErrors } from "../accounts/validation";

export { REQUIRED_MESSAGE, ValidationError, type FieldErrors };

export const AMOUNT_MESSAGE = "Enter the amount as a decimal string with up to 2 decimal places.";
export const PROBABILITY_MESSAGE = "Probability must be a whole number from 0 to 100.";
export const CLOSE_DATE_MESSAGE = "Enter a close date as YYYY-MM-DD.";

export const OPPORTUNITY_STAGES = ["Qualification", "Proposal", "Negotiation", "ClosedWon", "ClosedLost"] as const satisfies readonly OpportunityStage[];

const AMOUNT_PATTERN = /^-?\d{1,16}(\.\d{1,2})?$/;
const CLOSE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PROBABILITY_PATTERN = /^(?:100|[1-9]?\d)$/;

export type OpportunityInput = {
  name?: string | null;
  stageName?: unknown;
  amount?: unknown;
  closeDate?: unknown;
  probability?: unknown;
  accountId?: unknown;
  primaryContactId?: unknown;
  ownerId?: unknown;
};

export type ValidatedOpportunity = {
  name: string;
  stageName: OpportunityStage;
  amount: string | null;
  closeDate: Date;
  probability: number | null;
  accountId: string;
  primaryContactId: string | null;
  ownerId: string | null;
};

const text = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const isOpportunityStage = (value: string): value is OpportunityStage =>
  (OPPORTUNITY_STAGES as readonly string[]).includes(value);

/**
 * Toute étape peut passer à toute étape. Une valeur hors enum est refusée.
 * `from` null couvre la création, qui n'a pas d'étape précédente.
 */
export const applyStageTransition = (from: string | null, to: unknown): OpportunityStage => {
  const message = stageTransitionError(from, to);
  if (message) throw new ValidationError({ stageName: message });
  return (typeof to === "string" ? to.trim() : "") as OpportunityStage;
};

export const stageTransitionError = (from: string | null, to: unknown): string | null => {
  if (to === undefined || to === null || (typeof to === "string" && to.trim() === "")) return REQUIRED_MESSAGE;
  if (typeof to !== "string") return `"${String(to)}" is not a valid Stage value.`;
  const next = to.trim();
  if (!isOpportunityStage(next)) return `"${next}" is not a valid Stage value.`;
  if (from !== null && !isOpportunityStage(from)) return `"${from}" is not a valid Stage value.`;
  return null;
};

/** Chaîne `^-?\\d{1,16}(\\.\\d{1,2})?$`, ou null. Un nombre JSON est refusé. */
export const parseAmount = (value: unknown): { ok: true; amount: string | null } | { ok: false; message: string } => {
  if (value === undefined || value === null || value === "") return { ok: true, amount: null };
  if (typeof value !== "string") return { ok: false, message: AMOUNT_MESSAGE };
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, amount: null };
  if (!AMOUNT_PATTERN.test(trimmed)) return { ok: false, message: AMOUNT_MESSAGE };
  return { ok: true, amount: trimmed };
};

const parseCloseDate = (value: unknown, errors: FieldErrors): Date | null => {
  if (value === undefined || value === null || value === "") {
    errors.closeDate = REQUIRED_MESSAGE;
    return null;
  }
  if (typeof value !== "string" || !CLOSE_DATE_PATTERN.test(value.trim())) {
    errors.closeDate = CLOSE_DATE_MESSAGE;
    return null;
  }
  const match = CLOSE_DATE_PATTERN.exec(value.trim());
  if (!match) {
    errors.closeDate = CLOSE_DATE_MESSAGE;
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    errors.closeDate = CLOSE_DATE_MESSAGE;
    return null;
  }
  return date;
};

const parseProbability = (value: unknown, errors: FieldErrors): number | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      errors.probability = PROBABILITY_MESSAGE;
      return null;
    }
    return value;
  }
  if (typeof value !== "string" || !PROBABILITY_PATTERN.test(value.trim())) {
    errors.probability = PROBABILITY_MESSAGE;
    return null;
  }
  return Number(value.trim());
};

const optionalId = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const validateOpportunityInput = (
  input: OpportunityInput,
  options: { fromStage?: string | null } = {},
): { data: ValidatedOpportunity; errors: FieldErrors } => {
  const errors: FieldErrors = {};
  const name = text(input.name);
  if (!name) errors.name = REQUIRED_MESSAGE;
  else if (name.length > 120) errors.name = "Maximum length is 120 characters.";

  const stageMessage = stageTransitionError(options.fromStage ?? null, input.stageName);
  if (stageMessage) errors.stageName = stageMessage;
  const stageText = typeof input.stageName === "string" ? input.stageName.trim() : "";
  const stageName: OpportunityStage = isOpportunityStage(stageText) ? stageText : "Qualification";

  const amountResult = parseAmount(input.amount);
  if (!amountResult.ok) errors.amount = amountResult.message;

  const closeDate = parseCloseDate(input.closeDate, errors);
  const probability = parseProbability(input.probability, errors);

  const accountId = optionalId(input.accountId);
  if (!accountId) errors.accountId = REQUIRED_MESSAGE;

  const primaryContactId = optionalId(input.primaryContactId);
  if (input.primaryContactId !== undefined && input.primaryContactId !== null && input.primaryContactId !== "" && primaryContactId === null) {
    errors.primaryContactId = "Contact not found.";
  }

  return {
    data: {
      name: name ?? "",
      stageName,
      amount: amountResult.ok ? amountResult.amount : null,
      closeDate: closeDate ?? new Date(0),
      probability,
      accountId: accountId ?? "",
      primaryContactId,
      ownerId: optionalId(input.ownerId),
    },
    errors,
  };
};

export const opportunityInputFromFormData = (formData: FormData): OpportunityInput => {
  const get = (key: string) => {
    const value = formData.get(key);
    return value === null ? null : String(value);
  };
  return {
    name: get("name"),
    stageName: get("stageName"),
    amount: get("amount"),
    closeDate: get("closeDate"),
    probability: get("probability"),
    accountId: get("accountId"),
    primaryContactId: get("primaryContactId"),
    ownerId: get("ownerId"),
  };
};

const knownKeys = ["name", "stageName", "amount", "closeDate", "probability", "accountId", "primaryContactId", "ownerId"] as const;

export const opportunityInputFromJson = (body: unknown): OpportunityInput => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { name: "" };
  const record = body as Record<string, unknown>;
  const input: OpportunityInput = { name: "" };
  if ("name" in record) input.name = record.name == null ? "" : typeof record.name === "string" ? record.name : String(record.name);
  for (const key of knownKeys) {
    if (key === "name" || !(key in record)) continue;
    input[key] = record[key];
  }
  return input;
};

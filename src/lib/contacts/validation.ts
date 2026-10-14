// Validation Contact. Observé : seul Last Name est obligatoire, message
// « Complete this field. ». Account Name reste optionnel (module B). La civilité
// utilise l'enum conçu. L'adresse postale réutilise les pays et états Account.
import type { Salutation } from "@prisma/client";
import { findCountry } from "../accounts/picklists";
import { REQUIRED_MESSAGE, ValidationError, type FieldErrors } from "../accounts/validation";

export { REQUIRED_MESSAGE, ValidationError };
export type { FieldErrors };

export const SALUTATIONS = ["Mr", "Ms", "Dr", "Mx"] as const satisfies readonly Salutation[];

export type ContactInput = {
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  accountId?: string | null;
  reportsToId?: string | null;
  mailingStreet?: string | null;
  mailingCity?: string | null;
  mailingStateCode?: string | null;
  mailingPostalCode?: string | null;
  mailingCountryCode?: string | null;
  ownerId?: string | null;
};

export type ValidatedContact = {
  salutation: Salutation | null;
  firstName: string | null;
  lastName: string;
  title: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  accountId: string | null;
  reportsToId: string | null;
  mailingStreet: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingStateCode: string | null;
  mailingPostalCode: string | null;
  mailingCountry: string | null;
  mailingCountryCode: string | null;
  ownerId: string | null;
};

const MAX_LENGTHS: Record<string, number> = {
  firstName: 80,
  lastName: 80,
  title: 128,
  description: 32000,
  phone: 40,
  email: 255,
  mailingStreet: 255,
  mailingCity: 40,
  mailingPostalCode: 20,
};

const str = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const isSalutation = (value: string): value is Salutation => (SALUTATIONS as readonly string[]).includes(value);

const mailingAddress = (input: ContactInput, errors: FieldErrors) => {
  const countryCode = str(input.mailingCountryCode);
  const stateCode = str(input.mailingStateCode);
  const country = findCountry(countryCode);
  if (countryCode && !country) errors.mailingCountryCode = "Select a country from the list.";
  let resolvedState: string | null = null;
  if (stateCode) {
    if (!country) errors.mailingStateCode = "Select a country before a state/province.";
    else if (country.states.length === 0) errors.mailingStateCode = `${country.label} has no state/province values.`;
    else {
      const found = country.states.find((state) => state.code === stateCode);
      if (!found) errors.mailingStateCode = `"${stateCode}" is not a state/province of ${country.label}.`;
      else resolvedState = found.label;
    }
  }
  return {
    street: str(input.mailingStreet),
    city: str(input.mailingCity),
    postalCode: str(input.mailingPostalCode),
    countryCode: country ? country.code : null,
    country: country ? country.label : null,
    stateCode: resolvedState ? stateCode : null,
    state: resolvedState,
  };
};

export const validateContactInput = (input: ContactInput): { data: ValidatedContact; errors: FieldErrors } => {
  const errors: FieldErrors = {};
  const lastName = str(input.lastName);
  if (!lastName) errors.lastName = REQUIRED_MESSAGE;

  const salutationText = str(input.salutation);
  let salutation: Salutation | null = null;
  if (salutationText) {
    if (!isSalutation(salutationText)) errors.salutation = `"${salutationText}" is not a valid Salutation value.`;
    else salutation = salutationText;
  }

  const address = mailingAddress(input, errors);
  const data: ValidatedContact = {
    salutation,
    firstName: str(input.firstName),
    lastName: lastName ?? "",
    title: str(input.title),
    description: str(input.description),
    phone: str(input.phone),
    email: str(input.email),
    accountId: str(input.accountId),
    reportsToId: str(input.reportsToId),
    mailingStreet: address.street,
    mailingCity: address.city,
    mailingPostalCode: address.postalCode,
    mailingCountryCode: address.countryCode,
    mailingCountry: address.country,
    mailingStateCode: address.stateCode,
    mailingState: address.state,
    ownerId: str(input.ownerId),
  };

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    const value = data[key as keyof ValidatedContact];
    if (typeof value === "string" && value.length > max && !errors[key]) errors[key] = `Maximum length is ${max} characters.`;
  }

  return { data, errors };
};

const FORM_KEYS = [
  "salutation",
  "firstName",
  "lastName",
  "title",
  "description",
  "phone",
  "email",
  "accountId",
  "reportsToId",
  "mailingStreet",
  "mailingCity",
  "mailingStateCode",
  "mailingPostalCode",
  "mailingCountryCode",
  "ownerId",
] as const satisfies readonly (keyof ContactInput)[];

export const contactInputFromFormData = (formData: FormData): ContactInput => {
  const input: ContactInput = { lastName: "" };
  for (const key of FORM_KEYS) {
    const value = formData.get(key);
    input[key] = value === null ? null : String(value);
  }
  return input;
};

export const contactInputFromJson = (body: unknown): ContactInput => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { lastName: "" };
  const record = body as Record<string, unknown>;
  const input: ContactInput = { lastName: "" };
  for (const key of FORM_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    input[key] = value === null || value === undefined ? null : String(value);
  }
  return input;
};

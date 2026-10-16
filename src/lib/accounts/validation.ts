// Validation des saisies Account. Observé : seul Account Name est obligatoire
// (« Complete this field. ») ; aucune règle de validation définie dans l'org.
// Les longueurs maximales et types proviennent des types de champ observés.
import {
  COUNTRY_OPTIONS,
  findCountry,
  isActivePicklistValue,
  isPicklistValue,
  type PicklistName,
} from "./picklists";

export type AccountInput = {
  name: string;
  accountNumber?: string | null;
  site?: string | null;
  accountSource?: string | null;
  annualRevenue?: string | number | null;
  type?: string | null;
  industry?: string | null;
  ownership?: string | null;
  rating?: string | null;
  description?: string | null;
  website?: string | null;
  tickerSymbol?: string | null;
  sic?: string | null;
  sicDesc?: string | null;
  jigsaw?: string | null;
  tier?: string | null;
  numberOfEmployees?: string | number | null;
  isBuyer?: boolean | string | null;
  isCustomerPortal?: boolean | string | null;
  phone?: string | null;
  fax?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingStateCode?: string | null;
  billingPostalCode?: string | null;
  billingCountryCode?: string | null;
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingStateCode?: string | null;
  shippingPostalCode?: string | null;
  shippingCountryCode?: string | null;
  parentId?: string | null;
  ownerId?: string | null;
};

export type ValidatedAccount = {
  name: string;
  accountNumber: string | null;
  site: string | null;
  accountSource: string | null;
  annualRevenue: string | null;
  type: string | null;
  industry: string | null;
  ownership: string | null;
  rating: string | null;
  description: string | null;
  website: string | null;
  tickerSymbol: string | null;
  sic: string | null;
  sicDesc: string | null;
  jigsaw: string | null;
  tier: string | null;
  numberOfEmployees: number | null;
  isBuyer: boolean;
  isCustomerPortal: boolean;
  phone: string | null;
  fax: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingStateCode: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingCountryCode: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingStateCode: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  shippingCountryCode: string | null;
  parentId: string | null;
  ownerId: string | null;
};

export type FieldErrors = Record<string, string>;

export const REQUIRED_MESSAGE = "Complete this field.";

export class ValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

const str = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const bool = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  return /^(true|on|1|yes)$/i.test(String(value));
};

const MAX_LENGTHS: Record<string, number> = {
  name: 255,
  accountNumber: 40,
  site: 80,
  description: 32000,
  website: 255,
  tickerSymbol: 20,
  sic: 20,
  sicDesc: 80,
  jigsaw: 20,
  tier: 2,
  phone: 40,
  fax: 40,
  billingStreet: 255,
  billingCity: 40,
  billingPostalCode: 20,
  shippingStreet: 255,
  shippingCity: 40,
  shippingPostalCode: 20,
};

const picklist = (name: PicklistName, value: unknown, errors: FieldErrors, key: string, label: string, allowedHistorical?: string | null): string | null => {
  const text = str(value);
  if (!text) return null;
  if (!isPicklistValue(name, text)) {
    errors[key] = `"${text}" is not a valid ${label} value.`;
    return null;
  }
  if (!isActivePicklistValue(name, text) && text !== allowedHistorical) {
    errors[key] = `"${text}" is an inactive ${label} value.`;
    return null;
  }
  return text;
};

/** Keep Decimal(18,0) exact: JS numbers above MAX_SAFE_INTEGER are rejected. */
const decimalInteger = (value: unknown, errors: FieldErrors, key: string, label: string, digits: number): string | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    errors[key] = `${label} must be supplied as an exact decimal string.`;
    return null;
  }
  const raw = String(value).trim().replace(/[\s,]/g, "");
  if (!/^\d+$/.test(raw)) {
    errors[key] = `${label} must be a whole number.`;
    return null;
  }
  const canonical = raw.replace(/^0+(?=\d)/, "");
  if (canonical.length > digits) {
    errors[key] = `${label} cannot exceed ${digits} digits.`;
    return null;
  }
  return canonical;
};

const integer = (value: unknown, errors: FieldErrors, key: string, label: string, digits: number): number | null => {
  const text = str(value);
  if (!text) return null;
  const n = Number(text.replace(/[\s,]/g, ""));
  if (!Number.isInteger(n) || n < 0) {
    errors[key] = `${label} must be a whole number.`;
    return null;
  }
  if (String(n).length > digits) {
    errors[key] = `${label} cannot exceed ${digits} digits.`;
    return null;
  }
  return n;
};

const address = (
  prefix: "billing" | "shipping",
  input: AccountInput,
  errors: FieldErrors,
) => {
  const countryCode = str(input[`${prefix}CountryCode`]);
  const stateCode = str(input[`${prefix}StateCode`]);
  const country = findCountry(countryCode);
  if (countryCode && !country) {
    errors[`${prefix}CountryCode`] = "Select a country from the list.";
  }
  let resolvedState: string | null = null;
  if (stateCode) {
    if (!country) {
      errors[`${prefix}StateCode`] = "Select a country before a state/province.";
    } else if (country.states.length === 0) {
      errors[`${prefix}StateCode`] = `${country.label} has no state/province values.`;
    } else {
      const found = country.states.find((s) => s.code === stateCode);
      if (!found) errors[`${prefix}StateCode`] = `"${stateCode}" is not a state/province of ${country.label}.`;
      else resolvedState = found.label;
    }
  }
  return {
    street: str(input[`${prefix}Street`]),
    city: str(input[`${prefix}City`]),
    postalCode: str(input[`${prefix}PostalCode`]),
    countryCode: country ? country.code : null,
    country: country ? country.label : null,
    stateCode: resolvedState ? stateCode : null,
    state: resolvedState,
  };
};

export const validateAccountInput = (
  input: AccountInput,
  options: { historicalPicklists?: Partial<Record<PicklistName, string | null>> } = {},
): { data: ValidatedAccount; errors: FieldErrors } => {
  const errors: FieldErrors = {};
  const name = str(input.name);
  if (!name) errors.name = REQUIRED_MESSAGE;

  const data: ValidatedAccount = {
    name: name ?? "",
    accountNumber: str(input.accountNumber),
    site: str(input.site),
    accountSource: picklist("accountSource", input.accountSource, errors, "accountSource", "Account Source", options.historicalPicklists?.accountSource),
    annualRevenue: decimalInteger(input.annualRevenue, errors, "annualRevenue", "Annual Revenue", 18),
    type: picklist("type", input.type, errors, "type", "Type", options.historicalPicklists?.type),
    industry: picklist("industry", input.industry, errors, "industry", "Industry", options.historicalPicklists?.industry),
    ownership: picklist("ownership", input.ownership, errors, "ownership", "Ownership", options.historicalPicklists?.ownership),
    rating: picklist("rating", input.rating, errors, "rating", "Rating", options.historicalPicklists?.rating),
    description: str(input.description),
    website: str(input.website),
    tickerSymbol: str(input.tickerSymbol),
    sic: str(input.sic),
    sicDesc: str(input.sicDesc),
    jigsaw: str(input.jigsaw),
    tier: str(input.tier),
    numberOfEmployees: integer(input.numberOfEmployees, errors, "numberOfEmployees", "Employees", 8),
    isBuyer: bool(input.isBuyer),
    isCustomerPortal: bool(input.isCustomerPortal),
    phone: str(input.phone),
    fax: str(input.fax),
    billingStreet: null,
    billingCity: null,
    billingState: null,
    billingStateCode: null,
    billingPostalCode: null,
    billingCountry: null,
    billingCountryCode: null,
    shippingStreet: null,
    shippingCity: null,
    shippingState: null,
    shippingStateCode: null,
    shippingPostalCode: null,
    shippingCountry: null,
    shippingCountryCode: null,
    parentId: str(input.parentId),
    ownerId: str(input.ownerId),
  };

  const billing = address("billing", input, errors);
  data.billingStreet = billing.street;
  data.billingCity = billing.city;
  data.billingPostalCode = billing.postalCode;
  data.billingCountryCode = billing.countryCode;
  data.billingCountry = billing.country;
  data.billingStateCode = billing.stateCode;
  data.billingState = billing.state;

  const shipping = address("shipping", input, errors);
  data.shippingStreet = shipping.street;
  data.shippingCity = shipping.city;
  data.shippingPostalCode = shipping.postalCode;
  data.shippingCountryCode = shipping.countryCode;
  data.shippingCountry = shipping.country;
  data.shippingStateCode = shipping.stateCode;
  data.shippingState = shipping.state;

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    const value = (data as unknown as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > max && !errors[key]) {
      errors[key] = `Maximum length is ${max} characters.`;
    }
  }

  return { data, errors };
};

export const accountInputFromFormData = (formData: FormData): AccountInput => {
  const get = (key: string) => {
    const value = formData.get(key);
    return value === null ? null : String(value);
  };
  return {
    name: get("name") ?? "",
    accountNumber: get("accountNumber"),
    site: get("site"),
    accountSource: get("accountSource"),
    annualRevenue: get("annualRevenue"),
    type: get("type"),
    industry: get("industry"),
    ownership: get("ownership"),
    rating: get("rating"),
    description: get("description"),
    website: get("website"),
    tickerSymbol: get("tickerSymbol"),
    sic: get("sic"),
    sicDesc: get("sicDesc"),
    jigsaw: get("jigsaw"),
    tier: get("tier"),
    numberOfEmployees: get("numberOfEmployees"),
    isBuyer: formData.has("isBuyer") ? get("isBuyer") : null,
    isCustomerPortal: formData.has("isCustomerPortal") ? get("isCustomerPortal") : null,
    phone: get("phone"),
    fax: get("fax"),
    billingStreet: get("billingStreet"),
    billingCity: get("billingCity"),
    billingStateCode: get("billingStateCode"),
    billingPostalCode: get("billingPostalCode"),
    billingCountryCode: get("billingCountryCode"),
    shippingStreet: get("shippingStreet"),
    shippingCity: get("shippingCity"),
    shippingStateCode: get("shippingStateCode"),
    shippingPostalCode: get("shippingPostalCode"),
    shippingCountryCode: get("shippingCountryCode"),
    parentId: get("parentId"),
    ownerId: get("ownerId"),
  };
};

export const accountInputFromJson = (body: unknown): AccountInput => {
  if (!body || typeof body !== "object") return { name: "" };
  const record = body as Record<string, unknown>;
  const input: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value === undefined) continue;
    input[key] = value === null ? null : typeof value === "boolean" || (typeof value === "number" && (key === "annualRevenue" || key === "numberOfEmployees")) ? value : String(value);
  }
  return { name: "", ...input } as AccountInput;
};

export const COUNTRY_CODES = COUNTRY_OPTIONS.map((c) => c.code);

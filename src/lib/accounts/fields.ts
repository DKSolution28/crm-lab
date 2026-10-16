// Métadonnées des champs Account exposés aux listes, filtres et tris.
// Les libellés reprennent ceux observés (Object Manager, panneau Filters).
import type { PicklistName } from "./picklists";

export type FieldKind =
  | "text"
  | "textarea"
  | "url"
  | "phone"
  | "number"
  | "currency"
  | "picklist"
  | "country"
  | "state"
  | "boolean"
  | "date"
  | "datetime"
  | "lookup";

export type FieldDefinition = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Chemin Prisma : colonne scalaire ou relation.champ (ex. owner.alias). */
  path: string;
  picklist?: PicklistName;
  /** Pour `kind: "state"`, colonne du code pays dont dépend l'état. */
  countryPath?: string;
  filterable: boolean;
  sortable: boolean;
  /** Peut être affiché comme colonne de liste. */
  column: boolean;
  /** Statut documentaire : observé dans Salesforce ou conçu pour CRM Lab. */
  origin: "observed" | "designed";
};

const f = (def: FieldDefinition): FieldDefinition => def;

export const ACCOUNT_FIELDS: FieldDefinition[] = [
  f({ key: "name", label: "Account Name", kind: "text", path: "name", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "accountNumber", label: "Account Number", kind: "text", path: "accountNumber", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "ownerAlias", label: "Account Owner Alias", kind: "lookup", path: "owner.alias", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "ownerFirstName", label: "Owner First Name", kind: "lookup", path: "owner.firstName", filterable: true, sortable: false, column: false, origin: "observed" }),
  f({ key: "ownerLastName", label: "Owner Last Name", kind: "lookup", path: "owner.lastName", filterable: true, sortable: false, column: false, origin: "observed" }),
  f({ key: "site", label: "Account Site", kind: "text", path: "site", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "accountSource", label: "Account Source", kind: "picklist", path: "accountSource", picklist: "accountSource", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "annualRevenue", label: "Annual Revenue", kind: "currency", path: "annualRevenue", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingStreet", label: "Billing Street", kind: "text", path: "billingStreet", filterable: true, sortable: false, column: true, origin: "observed" }),
  f({ key: "billingCity", label: "Billing City", kind: "text", path: "billingCity", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingState", label: "Billing State/Province (text only)", kind: "text", path: "billingState", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingStateCode", label: "Billing State/Province", kind: "state", path: "billingStateCode", countryPath: "billingCountryCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingPostalCode", label: "Billing Zip/Postal Code", kind: "text", path: "billingPostalCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingCountry", label: "Billing Country (text only)", kind: "text", path: "billingCountry", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "billingCountryCode", label: "Billing Country", kind: "country", path: "billingCountryCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "isBuyer", label: "Buyer Account", kind: "boolean", path: "isBuyer", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "createdByAlias", label: "Created By Alias", kind: "lookup", path: "createdBy.alias", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "createdAt", label: "Created Date", kind: "datetime", path: "createdAt", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "isCustomerPortal", label: "Customer Portal Account", kind: "boolean", path: "isCustomerPortal", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "jigsaw", label: "Data.com Key", kind: "text", path: "jigsaw", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "description", label: "Description", kind: "textarea", path: "description", filterable: false, sortable: false, column: true, origin: "observed" }),
  f({ key: "tier", label: "Einstein Account Tier", kind: "text", path: "tier", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "numberOfEmployees", label: "Employees", kind: "number", path: "numberOfEmployees", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "fax", label: "Fax", kind: "phone", path: "fax", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "industry", label: "Industry", kind: "picklist", path: "industry", picklist: "industry", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "lastActivityDate", label: "Last Activity", kind: "date", path: "lastActivityDate", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "lastModifiedByAlias", label: "Last Modified By Alias", kind: "lookup", path: "lastModifiedBy.alias", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "updatedAt", label: "Last Modified Date", kind: "datetime", path: "updatedAt", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "ownership", label: "Ownership", kind: "picklist", path: "ownership", picklist: "ownership", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "parentName", label: "Parent Account", kind: "lookup", path: "parent.name", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "phone", label: "Phone", kind: "phone", path: "phone", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "rating", label: "Rating", kind: "picklist", path: "rating", picklist: "rating", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingStreet", label: "Shipping Street", kind: "text", path: "shippingStreet", filterable: true, sortable: false, column: true, origin: "observed" }),
  f({ key: "shippingCity", label: "Shipping City", kind: "text", path: "shippingCity", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingState", label: "Shipping State/Province (text only)", kind: "text", path: "shippingState", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingStateCode", label: "Shipping State/Province", kind: "state", path: "shippingStateCode", countryPath: "shippingCountryCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingPostalCode", label: "Shipping Zip/Postal Code", kind: "text", path: "shippingPostalCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingCountry", label: "Shipping Country (text only)", kind: "text", path: "shippingCountry", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "shippingCountryCode", label: "Shipping Country", kind: "country", path: "shippingCountryCode", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "sic", label: "SIC Code", kind: "text", path: "sic", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "sicDesc", label: "SIC Description", kind: "text", path: "sicDesc", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "tickerSymbol", label: "Ticker Symbol", kind: "text", path: "tickerSymbol", filterable: false, sortable: true, column: true, origin: "observed" }),
  f({ key: "type", label: "Type", kind: "picklist", path: "type", picklist: "type", filterable: true, sortable: true, column: true, origin: "observed" }),
  f({ key: "website", label: "Website", kind: "url", path: "website", filterable: true, sortable: true, column: true, origin: "observed" }),
];

const byKey = new Map(ACCOUNT_FIELDS.map((field) => [field.key, field]));

export const getField = (key: string): FieldDefinition | undefined => byKey.get(key);

export const requireField = (key: string): FieldDefinition => {
  const field = byKey.get(key);
  if (!field) throw new Error(`Unknown account field: ${key}`);
  return field;
};

export const FILTERABLE_FIELDS = ACCOUNT_FIELDS.filter((field) => field.filterable);
export const COLUMN_FIELDS = ACCOUNT_FIELDS.filter((field) => field.column);
export const SORTABLE_FIELD_KEYS = new Set(ACCOUNT_FIELDS.filter((field) => field.sortable).map((field) => field.key));

/** Champs éligibles au regroupement Kanban (observé : Owner, codes pays/état, Type). */
export const KANBAN_GROUP_FIELDS = [
  "ownerAlias",
  "billingCountryCode",
  "billingStateCode",
  "shippingCountryCode",
  "shippingStateCode",
  "type",
] as const;

/** Champs numériques pour « Summarize By » (déduit : la liste n'a pas été déroulée). */
export const KANBAN_SUMMARY_FIELDS = ["annualRevenue", "numberOfEmployees"] as const;

/** Colonnes par défaut observées sur la vue All Accounts. */
export const DEFAULT_COLUMNS = ["name", "phone", "website", "billingCity", "billingState", "ownerAlias"];
/** Colonnes observées sur la vue Recently Viewed. */
export const RECENT_COLUMNS = ["name", "phone", "ownerAlias"];

export const PRISMA_SELECT_FOR_LIST = {
  owner: { select: { id: true, alias: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, alias: true } },
  lastModifiedBy: { select: { id: true, alias: true } },
  parent: { select: { id: true, name: true } },
} as const;

// Champs Contact pour la liste, le tri et les filtres. Les libellés reprennent
// le formulaire observé (INT-5). Le tri et les filtres sont conçus : la liste
// Salesforce était couverte par la modale.
import type { FieldDefinition, FieldKind } from "../accounts/fields";

export type ContactFieldKind = "text" | "phone" | "country" | "state" | "datetime" | "lookup" | "salutation";

export type ContactField = {
  key: string;
  label: string;
  kind: ContactFieldKind;
  path: string;
  filterable: boolean;
  sortable: boolean;
  column: boolean;
};

const f = (field: ContactField): ContactField => field;

export const CONTACT_FIELDS: ContactField[] = [
  f({ key: "lastName", label: "Last Name", kind: "text", path: "lastName", filterable: true, sortable: true, column: true }),
  f({ key: "firstName", label: "First Name", kind: "text", path: "firstName", filterable: true, sortable: true, column: true }),
  f({ key: "salutation", label: "Salutation", kind: "salutation", path: "salutation", filterable: true, sortable: true, column: true }),
  f({ key: "title", label: "Title", kind: "text", path: "title", filterable: true, sortable: true, column: true }),
  f({ key: "email", label: "Email", kind: "text", path: "email", filterable: true, sortable: true, column: true }),
  f({ key: "phone", label: "Phone", kind: "phone", path: "phone", filterable: true, sortable: true, column: true }),
  f({ key: "accountName", label: "Account Name", kind: "lookup", path: "account.name", filterable: true, sortable: true, column: true }),
  f({ key: "mailingCity", label: "Mailing City", kind: "text", path: "mailingCity", filterable: true, sortable: true, column: true }),
  f({ key: "mailingCountryCode", label: "Mailing Country", kind: "country", path: "mailingCountryCode", filterable: true, sortable: true, column: true }),
  f({ key: "mailingStateCode", label: "Mailing State/Province", kind: "state", path: "mailingStateCode", filterable: true, sortable: true, column: false }),
  f({ key: "ownerAlias", label: "Contact Owner Alias", kind: "lookup", path: "owner.alias", filterable: true, sortable: true, column: true }),
  f({ key: "createdAt", label: "Created Date", kind: "datetime", path: "createdAt", filterable: true, sortable: true, column: false }),
  f({ key: "updatedAt", label: "Last Modified Date", kind: "datetime", path: "updatedAt", filterable: true, sortable: true, column: false }),
];

const byKey = new Map(CONTACT_FIELDS.map((field) => [field.key, field]));

export const getContactField = (key: string): ContactField | undefined => byKey.get(key);

export const SORTABLE_CONTACT_FIELDS = new Set(CONTACT_FIELDS.filter((field) => field.sortable).map((field) => field.key));

export const DEFAULT_CONTACT_SORT = "lastName";

/** Adapte un champ Contact au catalogue d'opérateurs Account, sans l'y enregistrer. */
export const asAccountField = (field: ContactField): FieldDefinition => ({
  key: field.key,
  label: field.label,
  kind: (field.kind === "salutation" ? "picklist" : field.kind === "lookup" ? "text" : field.kind) as FieldKind,
  path: field.path,
  filterable: field.filterable,
  sortable: field.sortable,
  column: field.column,
  origin: "designed",
});

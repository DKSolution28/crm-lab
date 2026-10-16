// Champs Lead exposés au tri et aux filtres d'URL. Pas de ListView.
import type { FieldDefinition, FieldKind } from "../accounts/fields";

export type LeadField = {
  key: string;
  label: string;
  kind: Extract<FieldKind, "text" | "phone" | "picklist" | "boolean" | "lookup">;
  path: string;
  filterable: boolean;
  sortable: boolean;
};

const field = (def: LeadField): LeadField => def;

export const LEAD_FIELDS: LeadField[] = [
  field({ key: "firstName", label: "First Name", kind: "text", path: "firstName", filterable: true, sortable: true }),
  field({ key: "lastName", label: "Last Name", kind: "text", path: "lastName", filterable: true, sortable: true }),
  field({ key: "company", label: "Company", kind: "text", path: "company", filterable: true, sortable: true }),
  field({ key: "title", label: "Title", kind: "text", path: "title", filterable: true, sortable: true }),
  field({ key: "email", label: "Email", kind: "text", path: "email", filterable: true, sortable: true }),
  field({ key: "phone", label: "Phone", kind: "phone", path: "phone", filterable: true, sortable: true }),
  field({ key: "description", label: "Description", kind: "text", path: "description", filterable: false, sortable: false }),
  field({ key: "status", label: "Lead Status", kind: "picklist", path: "status", filterable: true, sortable: true }),
  field({ key: "qualified", label: "Qualified", kind: "boolean", path: "qualified", filterable: true, sortable: true }),
  field({ key: "ownerAlias", label: "Owner Alias", kind: "lookup", path: "owner.alias", filterable: true, sortable: true }),
  field({ key: "createdAt", label: "Created Date", kind: "text", path: "createdAt", filterable: false, sortable: true }),
  field({ key: "updatedAt", label: "Last Modified Date", kind: "text", path: "updatedAt", filterable: false, sortable: true }),
];

const byKey = new Map(LEAD_FIELDS.map((item) => [item.key, item]));

export const getLeadField = (key: string): LeadField | undefined => byKey.get(key);

export const leadFieldDefinition = (item: LeadField): FieldDefinition => ({
  key: item.key,
  label: item.label,
  kind: item.kind,
  path: item.path,
  filterable: item.filterable,
  sortable: item.sortable,
  column: true,
  origin: "designed",
});

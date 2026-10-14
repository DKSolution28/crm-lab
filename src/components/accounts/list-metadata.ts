import type { ListView } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/current-user";
import { canManageListView } from "@/lib/auth/policies";
import { COLUMN_FIELDS, FILTERABLE_FIELDS, KANBAN_GROUP_FIELDS, KANBAN_SUMMARY_FIELDS, getField } from "@/lib/accounts/fields";
import { FILTER_OPERATORS, operatorsForField } from "@/lib/accounts/filters";
import { viewFilters } from "@/lib/accounts/list-views";
import { COUNTRY_OPTIONS, PICKLISTS } from "@/lib/accounts/picklists";
import type { FilterFieldOption } from "./filter-panel";
import type { ListViewDto } from "./types";

export const toViewDto = (view: ListView, user: CurrentUser): ListViewDto => ({
  id: view.id,
  developerName: view.developerName,
  label: view.label,
  visibility: view.visibility,
  scope: view.scope,
  columns: view.columns,
  sortField: view.sortField,
  sortDirection: view.sortDirection === "desc" ? "desc" : "asc",
  filters: viewFilters(view),
  filterLogic: view.filterLogic,
  isSystem: view.isSystem,
  ownerId: view.ownerId,
  canManage: canManageListView(user, view),
  pinned: user.pinnedAccountViewId === view.id,
});

export const columnOptions = () => COLUMN_FIELDS.map((field) => ({ key: field.key, label: field.label }));

export const kanbanGroupOptions = () => KANBAN_GROUP_FIELDS.map((key) => ({ key, label: key === "ownerAlias" ? "Account Owner" : getField(key)!.label.replace("Billing Country", "Billing Country Code").replace("Shipping Country", "Shipping Country Code").replace("State/Province", "State/Province Code") }));
export const kanbanSummaryOptions = () => KANBAN_SUMMARY_FIELDS.map((key) => ({ key, label: getField(key)!.label }));

export const filterFieldOptions = (): FilterFieldOption[] =>
  FILTERABLE_FIELDS.map((field) => {
    const operators = operatorsForField(field).map((value) => ({ value, label: FILTER_OPERATORS.find((o) => o.value === value)!.label }));
    let options: { value: string; label: string }[] | undefined;
    if (field.kind === "picklist" && field.picklist) {
      options = PICKLISTS[field.picklist].filter((o) => o.active).map((o) => ({ value: o.value, label: o.label }));
    } else if (field.kind === "country") {
      options = COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.label }));
    } else if (field.kind === "state") {
      options = COUNTRY_OPTIONS.flatMap((c) => c.states.map((s) => ({ value: s.code, label: `${s.label} (${c.code})` })));
    } else if (field.kind === "boolean") {
      options = [
        { value: "true", label: "True" },
        { value: "false", label: "False" },
      ];
    }
    return { key: field.key, label: field.label, kind: field.kind, operators, options };
  });

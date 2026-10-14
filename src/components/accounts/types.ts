import type { ListFilter } from "@/lib/accounts/filters";

/** Vue de liste sérialisée pour les composants client. */
export type ListViewDto = {
  id: string;
  developerName: string | null;
  label: string;
  visibility: "PRIVATE" | "EVERYONE";
  scope: "ALL" | "MINE" | "RECENT" | "NEW_THIS_WEEK";
  columns: string[];
  sortField: string | null;
  sortDirection: "asc" | "desc";
  filters: ListFilter[];
  filterLogic: string | null;
  isSystem: boolean;
  ownerId: string | null;
  canManage: boolean;
  pinned: boolean;
};

export type DisplayMode = "table" | "kanban" | "split";

export type ListUrlState = {
  view: string;
  display: DisplayMode;
  q: string;
  sort: string | null;
  dir: "asc" | "desc" | null;
  page: number;
  groupBy: string | null;
  summarizeBy: string | null;
  selected: string | null;
  filters: boolean;
};

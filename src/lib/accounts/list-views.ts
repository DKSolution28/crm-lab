// Vues de liste Accounts : vues système observées + gestion des vues
// personnelles (New, Clone, Rename, Sharing Settings, Select Fields to
// Display, Delete) et épinglage.
import type { ListView, ListViewVisibility, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canManageListView, canSeeListView } from "../auth/policies";
import { COLUMN_FIELDS, DEFAULT_COLUMNS, RECENT_COLUMNS, SORTABLE_FIELD_KEYS, getField } from "./fields";
import { normalizeFilters, parseFilterLogic, type ListFilter } from "./filters";

export const SYSTEM_VIEWS = [
  { developerName: "Recent", label: "Recently Viewed", scope: "RECENT", columns: RECENT_COLUMNS, sortField: null },
  { developerName: "AllAccounts", label: "All Accounts", scope: "ALL", columns: DEFAULT_COLUMNS, sortField: "name" },
  { developerName: "MyAccounts", label: "My Accounts", scope: "MINE", columns: DEFAULT_COLUMNS, sortField: "name" },
  { developerName: "NewThisWeek", label: "New This Week", scope: "NEW_THIS_WEEK", columns: DEFAULT_COLUMNS, sortField: "name" },
] as const;

export class ListViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListViewError";
  }
}

export const ensureSystemViews = async () => {
  for (const view of SYSTEM_VIEWS) {
    await prisma.listView.upsert({
      where: { developerName: view.developerName },
      update: {},
      create: {
        developerName: view.developerName,
        label: view.label,
        scope: view.scope,
        columns: [...view.columns],
        sortField: view.sortField,
        sortDirection: "asc",
        visibility: "EVERYONE",
        isSystem: true,
        filters: [],
      },
    });
  }
};

export const listVisibleViews = async (user: CurrentUser): Promise<ListView[]> => {
  await ensureSystemViews();
  const views = await prisma.listView.findMany({
    where: { objectType: "Account" },
    orderBy: [{ isSystem: "desc" }, { label: "asc" }],
  });
  return views.filter((view) => canSeeListView(user, view));
};

export const findView = async (identifier: string, user: CurrentUser): Promise<ListView | null> => {
  await ensureSystemViews();
  const view = await prisma.listView.findFirst({
    where: { objectType: "Account", OR: [{ id: identifier }, { developerName: identifier }] },
  });
  if (!view || !canSeeListView(user, view)) return null;
  return view;
};

export const resolveDefaultView = async (user: CurrentUser): Promise<ListView> => {
  if (user.pinnedAccountViewId) {
    const pinned = await prisma.listView.findUnique({ where: { id: user.pinnedAccountViewId } });
    if (pinned && canSeeListView(user, pinned)) return pinned;
  }
  const all = await findView("AllAccounts", user);
  if (!all) throw new ListViewError("System views are missing");
  return all;
};

export const viewFilters = (view: Pick<ListView, "filters">): ListFilter[] => {
  try {
    return normalizeFilters(view.filters ?? []);
  } catch {
    return [];
  }
};

const requireManageable = async (id: string, user: CurrentUser) => {
  const view = await prisma.listView.findUnique({ where: { id } });
  if (!view || !canSeeListView(user, view)) throw new ListViewError("List view not found");
  if (!canManageListView(user, view)) throw new AuthorizationError("You cannot modify this list view.");
  return view;
};

const normalizeColumns = (columns: unknown): string[] => {
  if (!Array.isArray(columns)) throw new ListViewError("columns must be an array");
  const keys = columns.map(String).filter((key, index, all) => all.indexOf(key) === index);
  for (const key of keys) {
    if (!COLUMN_FIELDS.some((field) => field.key === key)) throw new ListViewError(`"${key}" cannot be displayed as a column`);
  }
  if (!keys.includes("name")) keys.unshift("name");
  return keys;
};

const normalizeLabel = (label: unknown): string => {
  const text = String(label ?? "").trim();
  if (!text) throw new ListViewError("List view name is required");
  if (text.length > 80) throw new ListViewError("List view name cannot exceed 80 characters");
  return text;
};

const normalizeVisibility = (visibility: unknown): ListViewVisibility => {
  if (visibility === "PRIVATE" || visibility === "EVERYONE") return visibility;
  throw new ListViewError("visibility must be PRIVATE or EVERYONE");
};

export type NewListViewInput = {
  label: unknown;
  visibility?: unknown;
  scope?: unknown;
  columns?: unknown;
};

export const createView = async (input: NewListViewInput, user: CurrentUser): Promise<ListView> => {
  const scope = input.scope === "MINE" ? "MINE" : "ALL";
  return prisma.listView.create({
    data: {
      label: normalizeLabel(input.label),
      visibility: input.visibility === undefined ? "PRIVATE" : normalizeVisibility(input.visibility),
      scope,
      columns: input.columns === undefined ? DEFAULT_COLUMNS : normalizeColumns(input.columns),
      sortField: "name",
      sortDirection: "asc",
      filters: [],
      ownerId: user.id,
    },
  });
};

export const cloneView = async (sourceId: string, label: unknown, user: CurrentUser): Promise<ListView> => {
  const source = await prisma.listView.findUnique({ where: { id: sourceId } });
  if (!source || !canSeeListView(user, source)) throw new ListViewError("List view not found");
  return prisma.listView.create({
    data: {
      label: normalizeLabel(label),
      visibility: "PRIVATE",
      scope: source.scope === "RECENT" ? "ALL" : source.scope,
      columns: source.columns,
      sortField: source.sortField,
      sortDirection: source.sortDirection,
      filters: source.filters as Prisma.InputJsonValue,
      filterLogic: source.filterLogic,
      ownerId: user.id,
    },
  });
};

export const renameView = async (id: string, label: unknown, user: CurrentUser) => {
  await requireManageable(id, user);
  return prisma.listView.update({ where: { id }, data: { label: normalizeLabel(label) } });
};

export const setViewVisibility = async (id: string, visibility: unknown, user: CurrentUser) => {
  const view = await requireManageable(id, user);
  if (view.isSystem) throw new ListViewError("System views are always shared");
  return prisma.listView.update({ where: { id }, data: { visibility: normalizeVisibility(visibility) } });
};

export const setViewColumns = async (id: string, columns: unknown, user: CurrentUser) => {
  await requireManageable(id, user);
  return prisma.listView.update({ where: { id }, data: { columns: normalizeColumns(columns) } });
};

export const setViewSort = async (id: string, sortField: unknown, sortDirection: unknown, user: CurrentUser) => {
  const view = await requireManageable(id, user);
  if (view.scope === "RECENT") throw new ListViewError("Column sort is unavailable for this list view.");
  const key = String(sortField ?? "");
  if (!getField(key) || !SORTABLE_FIELD_KEYS.has(key)) throw new ListViewError(`"${key}" is not sortable`);
  const direction = sortDirection === "desc" ? "desc" : "asc";
  return prisma.listView.update({ where: { id }, data: { sortField: key, sortDirection: direction } });
};

export const setViewFilters = async (id: string, filters: unknown, filterLogic: unknown, user: CurrentUser) => {
  const view = await requireManageable(id, user);
  if (view.scope === "RECENT") throw new ListViewError("Filters are unavailable on Recently Viewed.");
  const normalized = normalizeFilters(filters ?? []);
  const logic = String(filterLogic ?? "").trim() || null;
  if (logic) parseFilterLogic(logic, normalized.length);
  return prisma.listView.update({
    where: { id },
    data: { filters: normalized as unknown as Prisma.InputJsonValue, filterLogic: logic },
  });
};

export const deleteView = async (id: string, user: CurrentUser) => {
  const view = await requireManageable(id, user);
  if (view.isSystem) throw new ListViewError("System views cannot be deleted");
  await prisma.listView.delete({ where: { id } });
};

export const pinView = async (id: string, user: CurrentUser) => {
  const view = await prisma.listView.findUnique({ where: { id } });
  if (!view || !canSeeListView(user, view)) throw new ListViewError("List view not found");
  await prisma.user.update({ where: { id: user.id }, data: { pinnedAccountViewId: id } });
  return view;
};

// Service Accounts : lecture, recherche, création, modification, suivi des
// enregistrements récemment consultés et regroupement Kanban.
import type { ListView, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditAccount } from "../auth/policies";
import { KANBAN_GROUP_FIELDS, KANBAN_SUMMARY_FIELDS, PRISMA_SELECT_FOR_LIST, SORTABLE_FIELD_KEYS, getField } from "./fields";
import { filtersToWhere } from "./filters";
import { viewFilters } from "./list-views";
import { countryLabel, picklistLabel, stateLabel } from "./picklists";
import { ValidationError, validateAccountInput, type AccountInput, type ValidatedAccount } from "./validation";

export class NotFoundError extends Error {
  constructor(message = "Record not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export type AccountRecord = Prisma.AccountGetPayload<{ include: typeof PRISMA_SELECT_FOR_LIST }>;

/** Représentation sérialisable (Decimal → string, Date → ISO) pour les composants client. */
export type AccountDto = Omit<AccountRecord, "annualRevenue" | "createdAt" | "updatedAt" | "lastActivityDate"> & {
  annualRevenue: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityDate: string | null;
};

export const toDto = (account: AccountRecord): AccountDto => ({
  ...account,
  annualRevenue: account.annualRevenue === null ? null : account.annualRevenue.toString(),
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt.toISOString(),
  lastActivityDate: account.lastActivityDate ? account.lastActivityDate.toISOString() : null,
});

export type SortDirection = "asc" | "desc";

export type ListOptions = {
  q?: string | null;
  sortField?: string | null;
  sortDirection?: SortDirection | null;
  page?: number;
  pageSize?: number;
};

export type ListResult = {
  items: AccountDto[];
  total: number;
  page: number;
  pageSize: number;
  sortField: string | null;
  sortDirection: SortDirection;
  sortable: boolean;
};

const SEARCH_FIELDS = ["name", "accountNumber", "phone", "website", "billingCity", "shippingCity", "site", "tickerSymbol"] as const;

export const searchWhere = (q: string | null | undefined): Prisma.AccountWhereInput => {
  const term = (q ?? "").trim();
  if (!term) return {};
  return { OR: SEARCH_FIELDS.map((field) => ({ [field]: { contains: term, mode: "insensitive" as const } })) };
};

export const startOfWeek = (now = new Date()): Date => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
};

export const scopeWhere = (view: Pick<ListView, "scope">, user: CurrentUser): Prisma.AccountWhereInput => {
  switch (view.scope) {
    case "MINE":
      return { ownerId: user.id };
    case "NEW_THIS_WEEK":
      return { createdAt: { gte: startOfWeek() } };
    case "RECENT":
      return { recentlyViewed: { some: { userId: user.id } } };
    default:
      return {};
  }
};

export const orderByFor = (sortField: string | null | undefined, direction: SortDirection): Prisma.AccountOrderByWithRelationInput[] => {
  const field = sortField ? getField(sortField) : undefined;
  if (!field || !SORTABLE_FIELD_KEYS.has(field.key)) return [{ name: "asc" }];
  const segments = field.path.split(".");
  let order: unknown = direction;
  for (let i = segments.length - 1; i >= 0; i -= 1) order = { [segments[i]]: order };
  return [order as Prisma.AccountOrderByWithRelationInput, { id: "asc" }];
};

export const viewWhere = (view: ListView, user: CurrentUser, q?: string | null): Prisma.AccountWhereInput => ({
  AND: [scopeWhere(view, user), filtersToWhere(viewFilters(view), view.filterLogic), searchWhere(q)],
});

export const listAccounts = async (view: ListView, user: CurrentUser, options: ListOptions = {}): Promise<ListResult> => {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
  const sortable = view.scope !== "RECENT";
  const sortField = sortable ? (options.sortField ?? view.sortField ?? "name") : null;
  const sortDirection: SortDirection = options.sortDirection === "desc" ? "desc" : options.sortDirection === "asc" ? "asc" : view.sortDirection === "desc" ? "desc" : "asc";
  const where = viewWhere(view, user, options.q);

  if (view.scope === "RECENT") {
    const recent = await prisma.recentlyViewed.findMany({
      where: { userId: user.id, account: where },
      orderBy: { viewedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { account: { include: PRISMA_SELECT_FOR_LIST } },
    });
    const total = await prisma.recentlyViewed.count({ where: { userId: user.id, account: where } });
    return { items: recent.map((r) => toDto(r.account)), total, page, pageSize, sortField: null, sortDirection: "asc", sortable: false };
  }

  const [items, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: orderByFor(sortField, sortDirection),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: PRISMA_SELECT_FOR_LIST,
    }),
    prisma.account.count({ where }),
  ]);
  return { items: items.map(toDto), total, page, pageSize, sortField, sortDirection, sortable };
};

export const getAccount = async (id: string): Promise<AccountDto | null> => {
  const account = await prisma.account.findUnique({ where: { id }, include: PRISMA_SELECT_FOR_LIST });
  return account ? toDto(account) : null;
};

export const getAccountWithRelated = async (id: string) => {
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      ...PRISMA_SELECT_FOR_LIST,
      children: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      contacts: { select: { id: true, firstName: true, lastName: true, email: true, title: true }, orderBy: { lastName: "asc" } },
      opportunities: { select: { id: true, name: true, stageName: true, amount: true, closeDate: true }, orderBy: { closeDate: "asc" } },
    },
  });
  if (!account) return null;
  return {
    ...toDto(account),
    children: account.children,
    contacts: account.contacts,
    opportunities: account.opportunities.map((o) => ({ ...o, amount: o.amount?.toString() ?? null, closeDate: o.closeDate.toISOString() })),
  };
};

export const recordView = async (accountId: string, user: CurrentUser) => {
  await prisma.recentlyViewed.upsert({
    where: { userId_accountId: { userId: user.id, accountId } },
    update: { viewedAt: new Date() },
    create: { userId: user.id, accountId },
  });
};

const toPrismaData = (data: ValidatedAccount) => {
  const { ownerId: _ownerId, parentId: _parentId, ...rest } = data;
  void _ownerId;
  void _parentId;
  return {
    ...rest,
    accountSource: rest.accountSource as Prisma.AccountUncheckedCreateInput["accountSource"],
    type: rest.type as Prisma.AccountUncheckedCreateInput["type"],
    industry: rest.industry as Prisma.AccountUncheckedCreateInput["industry"],
    ownership: rest.ownership as Prisma.AccountUncheckedCreateInput["ownership"],
    rating: rest.rating as Prisma.AccountUncheckedCreateInput["rating"],
  };
};

const resolveParent = async (parentId: string | null, selfId: string | null, errors: Record<string, string>) => {
  if (!parentId) return null;
  if (selfId && parentId === selfId) {
    errors.parentId = "An account cannot be its own parent.";
    return null;
  }
  const parent = await prisma.account.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
  if (!parent) {
    errors.parentId = "Parent account not found.";
    return null;
  }
  // Conçu : empêche un cycle dans la hiérarchie.
  let cursor = parent.parentId;
  const visited = new Set([parent.id]);
  while (cursor) {
    if (cursor === selfId || visited.has(cursor)) {
      errors.parentId = "This parent would create a loop in the account hierarchy.";
      return null;
    }
    if (visited.size >= 500) {
      errors.parentId = "The account hierarchy is too deep to validate.";
      return null;
    }
    visited.add(cursor);
    const next = await prisma.account.findUnique({ where: { id: cursor }, select: { parentId: true } });
    if (!next) {
      errors.parentId = "An ancestor account was not found.";
      return null;
    }
    cursor = next.parentId;
  }
  return parent.id;
};

const resolveOwner = async (ownerId: string | null, user: CurrentUser, errors: Record<string, string>) => {
  if (!ownerId || ownerId === user.id) return user.id;
  if (user.role !== "ADMIN") {
    errors.ownerId = "Only an administrator can assign another owner.";
    return user.id;
  }
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) {
    errors.ownerId = "Owner not found.";
    return user.id;
  }
  return owner.id;
};

export const createAccount = async (input: AccountInput, user: CurrentUser): Promise<AccountDto> => {
  const { data, errors } = validateAccountInput(input);
  const parentId = await resolveParent(data.parentId, null, errors);
  const ownerId = await resolveOwner(data.ownerId, user, errors);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  const account = await prisma.account.create({
    data: { ...toPrismaData(data), parentId, ownerId, createdById: user.id, lastModifiedById: user.id },
    include: PRISMA_SELECT_FOR_LIST,
  });
  await recordView(account.id, user);
  return toDto(account);
};

export const updateAccount = async (id: string, input: AccountInput, user: CurrentUser): Promise<AccountDto> => {
  const existing = await prisma.account.findUnique({
    where: { id },
    select: { id: true, ownerId: true, type: true, industry: true, accountSource: true, rating: true, ownership: true },
  });
  if (!existing) throw new NotFoundError("Account not found");
  if (!canEditAccount(user, existing)) throw new AuthorizationError("You can only edit accounts you own.");
  const { data, errors } = validateAccountInput(input, {
    historicalPicklists: {
      type: existing.type,
      industry: existing.industry,
      accountSource: existing.accountSource,
      rating: existing.rating,
      ownership: existing.ownership,
    },
  });
  const parentId = await resolveParent(data.parentId, id, errors);
  const ownerId = data.ownerId ? await resolveOwner(data.ownerId, user, errors) : existing.ownerId;
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  const account = await prisma.account.update({
    where: { id },
    data: { ...toPrismaData(data), parentId, ownerId, lastModifiedById: user.id },
    include: PRISMA_SELECT_FOR_LIST,
  });
  await recordView(account.id, user);
  return toDto(account);
};

/** Recherche globale (NAV-3) : comptes dont le nom ou des champs clés contiennent le terme. */
export const globalSearch = async (q: string, limit = 25) => {
  const where = searchWhere(q);
  if (!where.OR) return { items: [], total: 0 };
  const [items, total] = await Promise.all([
    prisma.account.findMany({ where, orderBy: { name: "asc" }, take: limit, include: PRISMA_SELECT_FOR_LIST }),
    prisma.account.count({ where }),
  ]);
  return { items: items.map(toDto), total };
};

/** Lookup Parent Account : suggestions par nom. */
export const lookupAccounts = async (q: string, excludeId?: string | null, limit = 8) => {
  const term = q.trim();
  return prisma.account.findMany({
    where: {
      ...(term ? { name: { contains: term, mode: "insensitive" } } : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, billingCity: true },
    orderBy: { name: "asc" },
    take: limit,
  });
};

// ---------------------------------------------------------------------------
// Kanban (LST-5) : regroupement en mémoire sur un champ autorisé.
// ---------------------------------------------------------------------------

export type KanbanGroupField = (typeof KANBAN_GROUP_FIELDS)[number];
export type KanbanSummaryField = (typeof KANBAN_SUMMARY_FIELDS)[number];

export const isKanbanGroupField = (value: string | null | undefined): value is KanbanGroupField =>
  !!value && (KANBAN_GROUP_FIELDS as readonly string[]).includes(value);
export const isKanbanSummaryField = (value: string | null | undefined): value is KanbanSummaryField =>
  !!value && (KANBAN_SUMMARY_FIELDS as readonly string[]).includes(value);

export const kanbanGroupValue = (account: AccountDto, field: KanbanGroupField): { key: string; label: string } => {
  switch (field) {
    case "ownerAlias":
      return { key: account.ownerId, label: account.owner.alias };
    case "type":
      return { key: account.type ?? "", label: account.type ? picklistLabel("type", account.type) : "" };
    case "billingCountryCode":
      return { key: account.billingCountryCode ?? "", label: countryLabel(account.billingCountryCode) };
    case "shippingCountryCode":
      return { key: account.shippingCountryCode ?? "", label: countryLabel(account.shippingCountryCode) };
    case "billingStateCode":
      return { key: account.billingStateCode ?? "", label: stateLabel(account.billingCountryCode, account.billingStateCode) };
    case "shippingStateCode":
      return { key: account.shippingStateCode ?? "", label: stateLabel(account.shippingCountryCode, account.shippingStateCode) };
  }
};

export type KanbanColumn = { key: string; label: string; items: AccountDto[]; summary: string | number | null };

export const groupForKanban = (items: AccountDto[], groupBy: KanbanGroupField, summarizeBy: KanbanSummaryField | null): KanbanColumn[] => {
  const columns = new Map<string, KanbanColumn>();
  for (const account of items) {
    const { key, label } = kanbanGroupValue(account, groupBy);
    const column: KanbanColumn = columns.get(key) ?? {
      key, label: label || "(None)", items: [],
      summary: summarizeBy === "annualRevenue" ? "0" : summarizeBy ? 0 : null,
    };
    column.items.push(account);
    if (summarizeBy === "annualRevenue") {
      column.summary = (BigInt(column.summary ?? "0") + BigInt(account.annualRevenue ?? "0")).toString();
    } else if (summarizeBy === "numberOfEmployees") {
      column.summary = Number(column.summary ?? 0) + (account.numberOfEmployees ?? 0);
    }
    columns.set(key, column);
  }
  return [...columns.values()].sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.label.localeCompare(b.label)));
};

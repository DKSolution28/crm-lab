// Lecture, création, modification et agrégats Kanban des opportunités.
// Les totaux de colonnes viennent du SUM SQL du filtre, pas d'une somme de page.
import { Prisma, type OpportunityStage } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditRecord } from "../auth/policies";
import { NotFoundError } from "../accounts/service";
import { recordRecentView, type DbClient } from "../recent/service";
import { normalizeKanbanAmount } from "./format";
import { FilterError, filtersToClause, normalizeOpportunityFilters } from "./filters";
import {
  REQUIRED_MESSAGE,
  ValidationError,
  validateOpportunityInput,
  type OpportunityInput,
  type ValidatedOpportunity,
  OPPORTUNITY_STAGES,
} from "./validation";

export { NotFoundError };

const opportunityInclude = {
  owner: { select: { id: true, alias: true, firstName: true, lastName: true } },
  account: { select: { id: true, name: true } },
  primaryContact: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.OpportunityInclude;

type OpportunityRecord = Prisma.OpportunityGetPayload<{ include: typeof opportunityInclude }>;

export type OpportunityDto = {
  id: string;
  name: string;
  stageName: OpportunityStage;
  amount: string | null;
  closeDate: string;
  probability: number | null;
  accountId: string | null;
  primaryContactId: string | null;
  ownerId: string;
  createdById: string;
  lastModifiedById: string;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; alias: string; firstName: string; lastName: string };
  account: { id: string; name: string } | null;
  primaryContact: { id: string; firstName: string | null; lastName: string } | null;
};

const closeDateString = (date: Date) => date.toISOString().slice(0, 10);

export const toDto = (opportunity: OpportunityRecord): OpportunityDto => ({
  id: opportunity.id,
  name: opportunity.name,
  stageName: opportunity.stageName,
  amount: opportunity.amount === null ? null : opportunity.amount.toString(),
  closeDate: closeDateString(opportunity.closeDate),
  probability: opportunity.probability,
  accountId: opportunity.accountId,
  primaryContactId: opportunity.primaryContactId,
  ownerId: opportunity.ownerId,
  createdById: opportunity.createdById,
  lastModifiedById: opportunity.lastModifiedById,
  createdAt: opportunity.createdAt.toISOString(),
  updatedAt: opportunity.updatedAt.toISOString(),
  owner: opportunity.owner,
  account: opportunity.account,
  primaryContact: opportunity.primaryContact,
});

export type SortDirection = "asc" | "desc";
export type OpportunityScope = "all" | "mine" | "recent";
export type OpportunityDisplay = "table" | "kanban";

export type OpportunityListOptions = {
  q?: string | null;
  sortField?: string | null;
  sortDirection?: string | null;
  page?: number;
  pageSize?: number;
  scope?: string | null;
  filters?: unknown;
  filterLogic?: string | null;
  display?: string | null;
};

export type KanbanColumnDto = {
  stage: OpportunityStage;
  label: string;
  count: number;
  amount: string;
  items: OpportunityDto[];
};

export type OpportunityListResult = {
  items: OpportunityDto[];
  total: number;
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: SortDirection;
  scope: OpportunityScope;
  columns?: KanbanColumnDto[];
};

const SORT_FIELDS = new Set(["name", "stageName", "amount", "closeDate", "probability", "createdAt"]);

export const parseScope = (value: string | null | undefined): OpportunityScope => {
  if (value === undefined || value === null || value === "" || value === "all") return "all";
  if (value === "mine" || value === "recent") return value;
  throw new FilterError("scope must be all, mine, or recent");
};

export const parseDisplay = (value: string | null | undefined): OpportunityDisplay => {
  if (value === undefined || value === null || value === "" || value === "table") return "table";
  if (value === "kanban") return "kanban";
  throw new FilterError("display must be table or kanban");
};

const parseDirection = (value: string | null | undefined): SortDirection => {
  if (value === undefined || value === null || value === "" || value === "asc") return "asc";
  if (value === "desc") return "desc";
  throw new FilterError("sortDirection must be asc or desc");
};

const orderByFor = (field: string, direction: SortDirection): Prisma.OpportunityOrderByWithRelationInput[] => {
  const primary: Prisma.OpportunityOrderByWithRelationInput =
    field === "name"
      ? { name: direction }
      : field === "stageName"
        ? { stageName: direction }
        : field === "amount"
          ? { amount: direction }
          : field === "probability"
            ? { probability: direction }
            : field === "createdAt"
              ? { createdAt: direction }
              : { closeDate: direction };
  return [primary, { id: "asc" }];
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const compileList = (user: CurrentUser, options: OpportunityListOptions) => {
  const scope = parseScope(options.scope);
  const filters = normalizeOpportunityFilters(options.filters ?? []);
  const parts: Prisma.OpportunityWhereInput[] = [];
  const sql: Prisma.Sql[] = [];
  if (scope === "mine") {
    parts.push({ ownerId: user.id });
    sql.push(Prisma.sql`"ownerId" = ${user.id}`);
  } else if (scope === "recent") {
    parts.push({ recentlyViewed: { some: { userId: user.id, objectType: "Opportunity" } } });
    sql.push(
      Prisma.sql`"id" IN (SELECT "opportunityId" FROM "RecentlyViewed" WHERE "userId" = ${user.id} AND "objectType" = CAST(${"Opportunity"} AS "RecentObject") AND "opportunityId" IS NOT NULL)`,
    );
  }
  const term = (options.q ?? "").trim();
  if (term) {
    parts.push({ name: { contains: term, mode: "insensitive" } });
    sql.push(Prisma.sql`"name" ILIKE ${`%${escapeLike(term)}%`} ESCAPE '\\'`);
  }
  if (filters.length > 0) {
    const clause = filtersToClause(filters, options.filterLogic);
    parts.push(clause.where);
    sql.push(clause.sql);
  }
  return {
    scope,
    where: parts.length > 0 ? { AND: parts } : {},
    whereSql: sql.length > 0 ? Prisma.join(sql, " AND ") : Prisma.sql`TRUE`,
  };
};

const readCount = (value: unknown): number => {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error("Kanban count must be an integer");
};

export const kanbanColumns = async (whereSql: Prisma.Sql, items: OpportunityDto[], db: DbClient = prisma): Promise<KanbanColumnDto[]> => {
  const client = db as Prisma.TransactionClient;
  const rows = await client.$queryRaw<Array<{ stage: string; count: unknown; amount: unknown }>>(Prisma.sql`
    SELECT s.stage::text AS stage,
           COALESCE(agg.count, 0)::int AS count,
           COALESCE(agg.amount, 0)::text AS amount
    FROM unnest(ARRAY['Qualification','Proposal','Negotiation','ClosedWon','ClosedLost']::"OpportunityStage"[]) AS s(stage)
    LEFT JOIN (
      SELECT "stageName" AS stage, COUNT(*) AS count, SUM("amount") AS amount
      FROM "Opportunity"
      WHERE ${whereSql}
      GROUP BY "stageName"
    ) agg ON agg.stage = s.stage
  `);
  const byStage = new Map(rows.map((row) => [row.stage, row]));
  const itemsByStage = new Map<string, OpportunityDto[]>();
  for (const item of items) {
    const list = itemsByStage.get(item.stageName) ?? [];
    list.push(item);
    itemsByStage.set(item.stageName, list);
  }
  return OPPORTUNITY_STAGES.map((stage) => {
    const row = byStage.get(stage);
    return {
      stage,
      label: stage,
      count: row ? readCount(row.count) : 0,
      amount: normalizeKanbanAmount(row ? row.amount : "0"),
      items: itemsByStage.get(stage) ?? [],
    };
  });
};

export const listOpportunities = async (user: CurrentUser, options: OpportunityListOptions = {}): Promise<OpportunityListResult> => {
  const display = parseDisplay(options.display);
  const sortDirection = parseDirection(options.sortDirection);
  const sortField = options.sortField && SORT_FIELDS.has(options.sortField) ? options.sortField : "closeDate";
  const page = Math.max(1, options.page ?? 1);
  const requestedSize = options.pageSize ?? (display === "kanban" ? 200 : 50);
  const pageSize = Math.min(200, Math.max(1, requestedSize));
  const compiled = compileList(user, options);
  const [records, total] = await Promise.all([
    prisma.opportunity.findMany({
      where: compiled.where,
      orderBy: orderByFor(sortField, sortDirection),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: opportunityInclude,
    }),
    prisma.opportunity.count({ where: compiled.where }),
  ]);
  const items = records.map(toDto);
  const result: OpportunityListResult = {
    items,
    total,
    page,
    pageSize,
    sortField,
    sortDirection,
    scope: compiled.scope,
  };
  if (display === "kanban") result.columns = await kanbanColumns(compiled.whereSql, items);
  return result;
};

export const getOpportunity = async (id: string): Promise<OpportunityDto | null> => {
  const opportunity = await prisma.opportunity.findUnique({ where: { id }, include: opportunityInclude });
  return opportunity ? toDto(opportunity) : null;
};

const throwIfInvalid = (errors: Record<string, string>) => {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
};

const resolveAccount = async (client: Prisma.TransactionClient, accountId: string, errors: Record<string, string>) => {
  if (!accountId || errors.accountId) return null;
  const account = await client.account.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!account) {
    errors.accountId = "Account not found.";
    return null;
  }
  return account.id;
};

const resolveContact = async (client: Prisma.TransactionClient, contactId: string | null, errors: Record<string, string>) => {
  if (!contactId || errors.primaryContactId) return null;
  const contact = await client.contact.findUnique({ where: { id: contactId }, select: { id: true } });
  if (!contact) {
    errors.primaryContactId = "Contact not found.";
    return null;
  }
  return contact.id;
};

const resolveOwner = async (client: Prisma.TransactionClient, ownerId: string | null, user: CurrentUser, errors: Record<string, string>) => {
  if (!ownerId || ownerId === user.id) return user.id;
  if (user.role !== "ADMIN") {
    errors.ownerId = "Only an administrator can assign another owner.";
    return user.id;
  }
  const owner = await client.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) {
    errors.ownerId = "Owner not found.";
    return user.id;
  }
  return owner.id;
};

const persistable = (data: ValidatedOpportunity, ownerId: string, user: CurrentUser) => ({
  name: data.name,
  stageName: data.stageName,
  amount: data.amount === null ? null : new Prisma.Decimal(data.amount),
  closeDate: data.closeDate,
  probability: data.probability,
  primaryContactId: data.primaryContactId,
  ownerId,
  lastModifiedById: user.id,
});

export const createOpportunity = async (input: OpportunityInput, user: CurrentUser, db: DbClient = prisma): Promise<OpportunityDto> => {
  const { data, errors } = validateOpportunityInput(input);
  const client = db as Prisma.TransactionClient;
  const accountId = await resolveAccount(client, data.accountId, errors);
  const primaryContactId = await resolveContact(client, data.primaryContactId, errors);
  const ownerId = await resolveOwner(client, data.ownerId, user, errors);
  throwIfInvalid(errors);
  if (!accountId) throw new ValidationError({ accountId: REQUIRED_MESSAGE });
  const created = await client.opportunity.create({
    data: { ...persistable({ ...data, primaryContactId }, ownerId, user), accountId, createdById: user.id },
    include: opportunityInclude,
  });
  await recordRecentView("Opportunity", created.id, user, db);
  return toDto(created);
};

export const updateOpportunity = async (id: string, input: OpportunityInput, user: CurrentUser): Promise<OpportunityDto> => {
  const existing = await prisma.opportunity.findUnique({ where: { id }, select: { id: true, ownerId: true, stageName: true } });
  if (!existing) throw new NotFoundError("Opportunity not found");
  if (!canEditRecord(user, existing)) throw new AuthorizationError("You can only edit opportunities you own.");
  const { data, errors } = validateOpportunityInput(input, { fromStage: existing.stageName });
  const accountId = await resolveAccount(prisma, data.accountId, errors);
  const primaryContactId = await resolveContact(prisma, data.primaryContactId, errors);
  const ownerId = data.ownerId && data.ownerId !== existing.ownerId ? await resolveOwner(prisma, data.ownerId, user, errors) : existing.ownerId;
  throwIfInvalid(errors);
  if (!accountId) throw new ValidationError({ accountId: REQUIRED_MESSAGE });
  const updated = await prisma.opportunity.update({
    where: { id },
    data: { ...persistable({ ...data, primaryContactId }, ownerId, user), accountId },
    include: opportunityInclude,
  });
  await recordRecentView("Opportunity", updated.id, user);
  return toDto(updated);
};

// Lecture, recherche et écriture des contacts. createContact accepte le client
// de transaction dès cette version : la conversion de lead l'utilise pour l'insert.
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditRecord } from "../auth/policies";
import { NotFoundError } from "../accounts/service";
import { ValidationError } from "../accounts/validation";
import { recordRecentView, type DbClient } from "../recent/service";
import { DEFAULT_CONTACT_SORT, SORTABLE_CONTACT_FIELDS, getContactField } from "./fields";
import { contactsToWhere, normalizeContactFilters, parseFiltersQuery, type ListFilter } from "./filters";
import { validateContactInput, type ContactInput, type ValidatedContact } from "./validation";

export { NotFoundError };

export const SELF_REPORTS_MESSAGE = "A contact cannot report to itself.";
export const LOOP_REPORTS_MESSAGE = "This contact would create a loop in the reporting line.";

const contactInclude = {
  owner: { select: { id: true, alias: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, alias: true } },
  lastModifiedBy: { select: { id: true, alias: true } },
  account: { select: { id: true, name: true } },
} satisfies Prisma.ContactInclude;

const detailInclude = {
  ...contactInclude,
  reportsTo: { select: { id: true, firstName: true, lastName: true } },
  directReports: {
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" as const }, { id: "asc" as const }],
  },
} satisfies Prisma.ContactInclude;

export type ContactRecord = Prisma.ContactGetPayload<{ include: typeof contactInclude }>;
export type ContactDetailRecord = Prisma.ContactGetPayload<{ include: typeof detailInclude }>;

type Person = { id: string; firstName: string | null; lastName: string };

export type ContactDto = Omit<ContactRecord, "createdAt" | "updatedAt" | "lastActivityDate"> & {
  createdAt: string;
  updatedAt: string;
  lastActivityDate: string | null;
};

export type ContactDetail = Omit<ContactDetailRecord, "createdAt" | "updatedAt" | "lastActivityDate"> & {
  createdAt: string;
  updatedAt: string;
  lastActivityDate: string | null;
  reportsTo: Person | null;
  directReports: Person[];
};

const toDto = (contact: ContactRecord): ContactDto => ({
  ...contact,
  createdAt: contact.createdAt.toISOString(),
  updatedAt: contact.updatedAt.toISOString(),
  lastActivityDate: contact.lastActivityDate ? contact.lastActivityDate.toISOString() : null,
});

const toDetail = (contact: ContactDetailRecord): ContactDetail => ({
  ...contact,
  createdAt: contact.createdAt.toISOString(),
  updatedAt: contact.updatedAt.toISOString(),
  lastActivityDate: contact.lastActivityDate ? contact.lastActivityDate.toISOString() : null,
  reportsTo: contact.reportsTo,
  directReports: contact.directReports,
});

export type ContactScope = "all" | "mine" | "recent";
export type SortDirection = "asc" | "desc";

export type ContactListOptions = {
  q?: string | null;
  sortField?: string | null;
  sortDirection?: SortDirection | null;
  page?: number;
  pageSize?: number;
  scope?: string | null;
  filters?: unknown;
  filterLogic?: string | null;
};

export type ContactListResult = {
  items: ContactDto[];
  total: number;
  page: number;
  pageSize: number;
  sortField: string | null;
  sortDirection: SortDirection;
  scope: ContactScope;
};

const SEARCH_FIELDS = ["firstName", "lastName", "email", "phone", "title"] as const;

export const searchWhere = (q: string | null | undefined): Prisma.ContactWhereInput => {
  const term = (q ?? "").trim();
  if (!term) return {};
  return { OR: SEARCH_FIELDS.map((field) => ({ [field]: { contains: term, mode: "insensitive" as const } })) };
};

const resolveScope = (scope: string | null | undefined): ContactScope => (scope === "mine" || scope === "recent" ? scope : "all");

const resolveFilters = (filters: unknown): ListFilter[] => {
  if (typeof filters === "string" || filters === undefined || filters === null) return parseFiltersQuery(typeof filters === "string" ? filters : null);
  return normalizeContactFilters(filters);
};

export const orderByFor = (sortField: string | null | undefined, direction: SortDirection): Prisma.ContactOrderByWithRelationInput[] => {
  const field = sortField ? getContactField(sortField) : undefined;
  if (!field || !SORTABLE_CONTACT_FIELDS.has(field.key)) return [{ lastName: "asc" }, { id: "asc" }];
  const segments = field.path.split(".");
  let order: unknown = direction;
  for (let index = segments.length - 1; index >= 0; index -= 1) order = { [segments[index]]: order };
  return [order as Prisma.ContactOrderByWithRelationInput, { id: "asc" }];
};

const clampPage = (page: number | undefined) => {
  const value = Math.floor(page ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const clampPageSize = (pageSize: number | undefined) => {
  const value = Math.floor(pageSize ?? 50);
  if (!Number.isFinite(value) || value <= 0) return 50;
  return Math.min(200, value);
};

export const listContacts = async (user: CurrentUser, options: ContactListOptions = {}): Promise<ContactListResult> => {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const scope = resolveScope(options.scope);
  const filters = resolveFilters(options.filters);
  const where: Prisma.ContactWhereInput = {
    AND: [scope === "mine" ? { ownerId: user.id } : {}, contactsToWhere(filters, options.filterLogic), searchWhere(options.q)],
  };
  if (scope === "recent") {
    const recentWhere: Prisma.RecentlyViewedWhereInput = {
      userId: user.id,
      objectType: "Contact",
      contactId: { not: null },
      contact: where,
    };
    const [recent, total] = await Promise.all([
      prisma.recentlyViewed.findMany({
        where: recentWhere,
        orderBy: { viewedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contact: { include: contactInclude } },
      }),
      prisma.recentlyViewed.count({ where: recentWhere }),
    ]);
    return {
      items: recent.flatMap((row) => (row.contact ? [toDto(row.contact)] : [])),
      total,
      page,
      pageSize,
      sortField: null,
      sortDirection: "asc",
      scope,
    };
  }
  const sortField = options.sortField && SORTABLE_CONTACT_FIELDS.has(options.sortField) ? options.sortField : DEFAULT_CONTACT_SORT;
  const sortDirection: SortDirection = options.sortDirection === "desc" ? "desc" : "asc";
  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: orderByFor(sortField, sortDirection),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: contactInclude,
    }),
    prisma.contact.count({ where }),
  ]);
  return { items: items.map(toDto), total, page, pageSize, sortField, sortDirection, scope };
};

export const getContact = async (id: string): Promise<ContactDetail | null> => {
  const contact = await prisma.contact.findUnique({ where: { id }, include: detailInclude });
  return contact ? toDetail(contact) : null;
};

const clientOf = (db: DbClient) => db as Prisma.TransactionClient;

const resolveAccount = async (accountId: string | null, errors: Record<string, string>, db: Prisma.TransactionClient) => {
  if (!accountId) return null;
  const account = await db.account.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!account) {
    errors.accountId = "Account not found.";
    return null;
  }
  return account.id;
};

const resolveReportsTo = async (reportsToId: string | null, selfId: string | null, errors: Record<string, string>, db: Prisma.TransactionClient) => {
  if (!reportsToId) return null;
  if (selfId && reportsToId === selfId) {
    errors.reportsToId = SELF_REPORTS_MESSAGE;
    return null;
  }
  const manager = await db.contact.findUnique({ where: { id: reportsToId }, select: { id: true, reportsToId: true } });
  if (!manager) {
    errors.reportsToId = "Reports To contact not found.";
    return null;
  }
  let cursor = manager.reportsToId;
  const visited = new Set([manager.id]);
  while (cursor) {
    if (cursor === selfId || visited.has(cursor)) {
      errors.reportsToId = LOOP_REPORTS_MESSAGE;
      return null;
    }
    if (visited.size >= 500) {
      errors.reportsToId = "The reporting line is too deep to validate.";
      return null;
    }
    visited.add(cursor);
    const next = await db.contact.findUnique({ where: { id: cursor }, select: { reportsToId: true } });
    if (!next) {
      errors.reportsToId = "An ancestor contact was not found.";
      return null;
    }
    cursor = next.reportsToId;
  }
  return manager.id;
};

const resolveOwner = async (ownerId: string | null, user: CurrentUser, errors: Record<string, string>, db: Prisma.TransactionClient) => {
  if (!ownerId || ownerId === user.id) return user.id;
  if (user.role !== "ADMIN") {
    errors.ownerId = "Only an administrator can assign another owner.";
    return user.id;
  }
  const owner = await db.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) {
    errors.ownerId = "Owner not found.";
    return user.id;
  }
  return owner.id;
};

const toWriteData = (data: ValidatedContact) => ({
  salutation: data.salutation,
  firstName: data.firstName,
  lastName: data.lastName,
  title: data.title,
  description: data.description,
  phone: data.phone,
  email: data.email,
  mailingStreet: data.mailingStreet,
  mailingCity: data.mailingCity,
  mailingPostalCode: data.mailingPostalCode,
  mailingCountryCode: data.mailingCountryCode,
  mailingCountry: data.mailingCountry,
  mailingStateCode: data.mailingStateCode,
  mailingState: data.mailingState,
});

export const createContact = async (input: ContactInput, user: CurrentUser, db: DbClient = prisma): Promise<ContactDto> => {
  const client = clientOf(db);
  const { data, errors } = validateContactInput(input);
  const accountId = await resolveAccount(data.accountId, errors, client);
  const reportsToId = await resolveReportsTo(data.reportsToId, null, errors, client);
  const ownerId = await resolveOwner(data.ownerId, user, errors, client);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  const contact = await client.contact.create({
    data: { ...toWriteData(data), accountId, reportsToId, ownerId, createdById: user.id, lastModifiedById: user.id },
    include: contactInclude,
  });
  await recordRecentView("Contact", contact.id, user, db);
  return toDto(contact);
};

export const updateContact = async (id: string, input: ContactInput, user: CurrentUser): Promise<ContactDto> => {
  const existing = await prisma.contact.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!existing) throw new NotFoundError("Contact not found");
  if (!canEditRecord(user, existing)) throw new AuthorizationError("You can only edit contacts you own.");
  const { data, errors } = validateContactInput(input);
  const accountId = await resolveAccount(data.accountId, errors, clientOf(prisma));
  const reportsToId = await resolveReportsTo(data.reportsToId, id, errors, clientOf(prisma));
  const ownerId = data.ownerId ? await resolveOwner(data.ownerId, user, errors, clientOf(prisma)) : existing.ownerId;
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  const contact = await prisma.contact.update({
    where: { id },
    data: { ...toWriteData(data), accountId, reportsToId, ownerId, lastModifiedById: user.id },
    include: contactInclude,
  });
  await recordRecentView("Contact", contact.id, user);
  return toDto(contact);
};

export const lookupContacts = async (q: string, excludeId?: string | null, limit = 8) => {
  const term = q.trim();
  const take = Math.min(8, Math.max(1, limit));
  return prisma.contact.findMany({
    where: {
      ...(term
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { id: "asc" }],
    take,
  });
};

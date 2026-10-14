// Lecture et écriture des leads. La conversion n'est pas implémentée ici.
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditRecord } from "../auth/policies";
import { NotFoundError } from "../accounts/service";
import { ConflictError, type LeadConversionConflict } from "../errors";
import { recordRecentView } from "../recent/service";
import { getLeadField } from "./fields";
import { leadFiltersToWhere, type LeadListQuery, type LeadScope } from "./filters";
import {
  ValidationError,
  convertWriteErrors,
  isRecord,
  leadInputFromJson,
  validateLeadInput,
  type LeadInput,
  type ValidatedLead,
} from "./validation";

export { NotFoundError };

const userSelect = { select: { id: true, alias: true, firstName: true, lastName: true } } as const;

export const LEAD_INCLUDE = {
  owner: userSelect,
  createdBy: userSelect,
  lastModifiedBy: userSelect,
} as const;

type LeadRecord = Prisma.LeadGetPayload<{ include: typeof LEAD_INCLUDE }>;

export type LeadUser = { id: string; alias: string; firstName: string; lastName: string };

export type LeadDto = {
  id: string;
  firstName: string | null;
  lastName: string;
  company: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  status: LeadRecord["status"];
  qualified: boolean;
  ownerId: string;
  owner: LeadUser;
  createdById: string;
  createdBy: LeadUser;
  lastModifiedById: string;
  lastModifiedBy: LeadUser;
  createdAt: string;
  updatedAt: string;
  convertedAt: string | null;
  convertedAccountId: string | null;
  convertedContactId: string | null;
  convertedOpportunityId: string | null;
  conversion: LeadConversionConflict | null;
};

export type LeadListResult = {
  items: LeadDto[];
  total: number;
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: "asc" | "desc";
  scope: LeadScope;
};

const conversionOf = (lead: Pick<LeadRecord, "convertedAt" | "convertedAccountId" | "convertedContactId" | "convertedOpportunityId">): LeadConversionConflict | null => {
  if (!lead.convertedAt) return null;
  return {
    accountId: lead.convertedAccountId,
    contactId: lead.convertedContactId,
    opportunityId: lead.convertedOpportunityId,
    convertedAt: lead.convertedAt.toISOString(),
  };
};

export const toDto = (lead: LeadRecord): LeadDto => ({
  id: lead.id,
  firstName: lead.firstName,
  lastName: lead.lastName,
  company: lead.company,
  title: lead.title,
  email: lead.email,
  phone: lead.phone,
  description: lead.description,
  status: lead.status,
  qualified: lead.qualified,
  ownerId: lead.ownerId,
  owner: lead.owner,
  createdById: lead.createdById,
  createdBy: lead.createdBy,
  lastModifiedById: lead.lastModifiedById,
  lastModifiedBy: lead.lastModifiedBy,
  createdAt: lead.createdAt.toISOString(),
  updatedAt: lead.updatedAt.toISOString(),
  convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
  convertedAccountId: lead.convertedAccountId,
  convertedContactId: lead.convertedContactId,
  convertedOpportunityId: lead.convertedOpportunityId,
  conversion: conversionOf(lead),
});

const SEARCH_FIELDS = ["firstName", "lastName", "company", "email", "phone"] as const;

export const searchWhere = (q: string | null | undefined): Prisma.LeadWhereInput => {
  const term = (q ?? "").trim();
  if (!term) return {};
  return { OR: SEARCH_FIELDS.map((field) => ({ [field]: { contains: term, mode: "insensitive" as const } })) };
};

const andWhere = (parts: Prisma.LeadWhereInput[]): Prisma.LeadWhereInput => {
  const present = parts.filter((part) => Object.keys(part).length > 0);
  if (present.length === 0) return {};
  if (present.length === 1) return present[0];
  return { AND: present };
};

const orderByFor = (sortField: string, direction: "asc" | "desc"): Prisma.LeadOrderByWithRelationInput[] => {
  const field = getLeadField(sortField);
  const path = field?.sortable ? field.path : "lastName";
  const segments = path.split(".");
  let order: unknown = direction;
  for (let i = segments.length - 1; i >= 0; i -= 1) order = { [segments[i]]: order };
  return [order as Prisma.LeadOrderByWithRelationInput, { id: "asc" }];
};

export const listLeads = async (user: CurrentUser, options: LeadListQuery): Promise<LeadListResult> => {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize || 50));
  const sortField = options.sortField && getLeadField(options.sortField)?.sortable ? options.sortField : "lastName";
  const sortDirection = options.sortDirection === "desc" ? "desc" : "asc";
  const scope = options.scope;
  const where = andWhere([
    scope === "mine" ? { ownerId: user.id } : {},
    leadFiltersToWhere(options.filters, options.filterLogic),
    searchWhere(options.q),
  ]);

  if (scope === "recent") {
    const recentWhere: Prisma.RecentlyViewedWhereInput = {
      userId: user.id,
      objectType: "Lead",
      leadId: { not: null },
      ...(Object.keys(where).length > 0 ? { lead: where } : {}),
    };
    const [recent, total] = await Promise.all([
      prisma.recentlyViewed.findMany({
        where: recentWhere,
        orderBy: { viewedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lead: { include: LEAD_INCLUDE } },
      }),
      prisma.recentlyViewed.count({ where: recentWhere }),
    ]);
    return {
      items: recent.flatMap((row) => (row.lead ? [toDto(row.lead)] : [])),
      total,
      page,
      pageSize,
      sortField,
      sortDirection,
      scope,
    };
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: orderByFor(sortField, sortDirection),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: LEAD_INCLUDE,
    }),
    prisma.lead.count({ where }),
  ]);
  return { items: items.map(toDto), total, page, pageSize, sortField, sortDirection, scope };
};

export const getLead = async (id: string): Promise<LeadDto | null> => {
  const lead = await prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
  return lead ? toDto(lead) : null;
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

const toData = (data: ValidatedLead, ownerId: string, userId: string) => ({
  firstName: data.firstName,
  lastName: data.lastName,
  company: data.company,
  title: data.title,
  email: data.email,
  phone: data.phone,
  description: data.description,
  status: data.status,
  qualified: data.qualified,
  ownerId,
  lastModifiedById: userId,
});

const throwIfInvalid = (errors: Record<string, string>) => {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
};

const applyConvertErrors = (record: Record<string, unknown>, errors: Record<string, string>) => {
  for (const [key, message] of Object.entries(convertWriteErrors(record))) errors[key] = message;
};

export const createLead = async (body: unknown, user: CurrentUser): Promise<LeadDto> => {
  const record = isRecord(body) ? body : {};
  const { data, errors } = validateLeadInput(leadInputFromJson(record));
  applyConvertErrors(record, errors);
  const ownerId = await resolveOwner(data.ownerId, user, errors);
  throwIfInvalid(errors);
  const lead = await prisma.lead.create({
    data: { ...toData(data, ownerId, user.id), createdById: user.id },
    include: LEAD_INCLUDE,
  });
  await recordRecentView("Lead", lead.id, user);
  return toDto(lead);
};

const EDITABLE_KEYS = ["firstName", "lastName", "company", "title", "email", "phone", "description", "status", "qualified", "ownerId"] as const;

const mergeLead = (existing: LeadRecord, body: Record<string, unknown>): LeadInput => {
  const input: LeadInput = {
    firstName: existing.firstName,
    lastName: existing.lastName,
    company: existing.company,
    title: existing.title,
    email: existing.email,
    phone: existing.phone,
    description: existing.description,
    status: existing.status,
    qualified: existing.qualified,
    ownerId: existing.ownerId,
  };
  for (const key of EDITABLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) input[key] = body[key];
  }
  return input;
};

export const updateLead = async (id: string, body: unknown, user: CurrentUser): Promise<LeadDto> => {
  const existing = await prisma.lead.findUnique({ where: { id }, include: LEAD_INCLUDE });
  if (!existing) throw new NotFoundError("Lead not found");
  const conversion = conversionOf(existing);
  if (existing.convertedAt && conversion) {
    throw new ConflictError("This lead is already converted.", conversion);
  }
  if (!canEditRecord(user, existing)) throw new AuthorizationError("You can only edit leads you own.");
  if (!isRecord(body)) throw new SyntaxError("Invalid JSON body");
  const record = body;
  const { data, errors } = validateLeadInput(mergeLead(existing, record));
  applyConvertErrors(record, errors);
  const ownerId = data.ownerId ? await resolveOwner(data.ownerId, user, errors) : existing.ownerId;
  throwIfInvalid(errors);
  const lead = await prisma.lead.update({
    where: { id },
    data: toData(data, ownerId, user.id),
    include: LEAD_INCLUDE,
  });
  await recordRecentView("Lead", lead.id, user);
  return toDto(lead);
};

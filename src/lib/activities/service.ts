// Tâches liées à exactement un parent. La clôture et la création posent
// lastActivityDate sur Account et Contact depuis ce service.
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditRecord } from "../auth/policies";
import { NotFoundError } from "../accounts/service";
import type { FieldErrors } from "../accounts/validation";
import { ValidationError } from "../accounts/validation";
import { isParentType, type ParentType } from "./picklists";
import {
  EXACTLY_ONE_PARENT_MESSAGE,
  PARENT_LOCKED_MESSAGE,
  PARENT_NOT_FOUND_MESSAGE,
  ParentRequiredError,
  applyParentExistence,
  assertSingleParentColumns,
  collectParentRefs,
  mentionsParent,
  parentColumns,
  validateTaskFields,
  type ParentColumns,
  type ParentRef,
  type ValidatedTaskFields,
} from "./validation";

export { NotFoundError, ParentRequiredError };

export class UnknownParentError extends NotFoundError {
  readonly fieldErrors: FieldErrors;

  constructor() {
    super("Record not found");
    this.name = "UnknownParentError";
    this.fieldErrors = { parent: PARENT_NOT_FOUND_MESSAGE };
  }
}

const userSelect = { id: true, alias: true, firstName: true, lastName: true } as const;

const taskInclude = {
  assignee: { select: userSelect },
  owner: { select: userSelect },
} satisfies Prisma.TaskInclude;

type TaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
type Db = Prisma.TransactionClient | typeof prisma;

export type TaskUser = { id: string; alias: string; firstName: string; lastName: string };

export type TaskDto = {
  id: string;
  subject: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  assigneeId: string;
  ownerId: string;
  createdById: string;
  lastModifiedById: string;
  createdAt: string;
  updatedAt: string;
  assignee: TaskUser;
  owner: TaskUser;
  parent: ParentRef;
};

export type TaskList = { open: TaskDto[]; history: TaskDto[] };

const dateString = (value: Date | null): string | null => (value ? value.toISOString().slice(0, 10) : null);

export const parentOf = (task: {
  accountId: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
}): ParentRef => {
  if (task.accountId) return { type: "Account", id: task.accountId };
  if (task.contactId) return { type: "Contact", id: task.contactId };
  if (task.leadId) return { type: "Lead", id: task.leadId };
  if (task.opportunityId) return { type: "Opportunity", id: task.opportunityId };
  throw new ParentRequiredError();
};

const toDto = (task: TaskRecord): TaskDto => ({
  id: task.id,
  subject: task.subject,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: dateString(task.dueDate),
  completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  assigneeId: task.assigneeId,
  ownerId: task.ownerId,
  createdById: task.createdById,
  lastModifiedById: task.lastModifiedById,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
  assignee: task.assignee,
  owner: task.owner,
  parent: parentOf(task),
});

const whereFor = (parent: ParentRef): Prisma.TaskWhereInput => {
  switch (parent.type) {
    case "Account":
      return { accountId: parent.id };
    case "Contact":
      return { contactId: parent.id };
    case "Lead":
      return { leadId: parent.id };
    case "Opportunity":
      return { opportunityId: parent.id };
  }
};

const findParent = async (db: Db, parent: ParentRef) => {
  switch (parent.type) {
    case "Account":
      return db.account.findUnique({ where: { id: parent.id }, select: { id: true } });
    case "Contact":
      return db.contact.findUnique({ where: { id: parent.id }, select: { id: true } });
    case "Lead":
      return db.lead.findUnique({ where: { id: parent.id }, select: { id: true } });
    case "Opportunity":
      return db.opportunity.findUnique({ where: { id: parent.id }, select: { id: true } });
  }
};

const touchParentActivity = async (db: Db, parent: ParentRef, at: Date) => {
  if (parent.type === "Account") {
    await db.account.update({ where: { id: parent.id }, data: { lastActivityDate: at } });
    return;
  }
  if (parent.type === "Contact") {
    await db.contact.update({ where: { id: parent.id }, data: { lastActivityDate: at } });
  }
};

const resolveAssignee = async (db: Db, assigneeId: string | null, user: CurrentUser, errors: FieldErrors) => {
  const id = assigneeId || user.id;
  const assignee = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!assignee) {
    errors.assigneeId = "Assignee not found.";
    return user.id;
  }
  return assignee.id;
};

const resolveOwner = async (db: Db, ownerId: string | null, user: CurrentUser, errors: FieldErrors) => {
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

const throwFieldErrors = (errors: FieldErrors) => {
  if (errors.parent === PARENT_NOT_FOUND_MESSAGE && Object.keys(errors).length === 1) throw new UnknownParentError();
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
};

const requireSingleParent = (input: unknown): ParentRef => {
  const collected = collectParentRefs(input);
  if (collected.incoherent || collected.refs.length === 0) throw new ParentRequiredError();
  if (collected.refs.length !== 1) throw new ValidationError({ parent: EXACTLY_ONE_PARENT_MESSAGE });
  return collected.refs[0];
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const parentPathname = (parent: ParentRef) => {
  switch (parent.type) {
    case "Account":
      return `/accounts/${parent.id}`;
    case "Contact":
      return `/contacts/${parent.id}`;
    case "Lead":
      return `/leads/${parent.id}`;
    case "Opportunity":
      return `/opportunities/${parent.id}`;
  }
};

export const parentRecordHref = (parent: ParentRef) =>
  parent.type === "Account" ? `${parentPathname(parent)}?tab=related` : parentPathname(parent);

const parseListParent = (parentType: string | null, parentId: string | null): ParentRef => {
  const type = parentType?.trim() ?? "";
  const id = parentId?.trim() ?? "";
  if (!type || !id || !isParentType(type)) throw new ParentRequiredError();
  return { type, id };
};

export const listTasks = async (parentType: string | null, parentId: string | null): Promise<TaskList> => {
  const parent = parseListParent(parentType, parentId);
  const found = await findParent(prisma, parent);
  if (!found) throw new UnknownParentError();
  const where = whereFor(parent);
  const [open, history] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [where, { status: { not: "Completed" } }] },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: taskInclude,
    }),
    prisma.task.findMany({
      where: { AND: [where, { status: "Completed" }] },
      orderBy: [{ completedAt: "desc" }],
      include: taskInclude,
    }),
  ]);
  return { open: open.map(toDto), history: history.map(toDto) };
};

export const getTask = async (id: string): Promise<TaskDto | null> => {
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  return task ? toDto(task) : null;
};

const writeData = (data: ValidatedTaskFields, assigneeId: string, ownerId: string, userId: string) => ({
  subject: data.subject,
  description: data.description,
  status: data.status,
  priority: data.priority,
  dueDate: data.dueDate,
  assigneeId,
  ownerId,
  lastModifiedById: userId,
});

export const createTask = async (input: unknown, user: CurrentUser): Promise<TaskDto> => {
  const record = isRecord(input) ? input : {};
  const { data, errors } = validateTaskFields(record, { applyDefaults: true });
  // Deux parents sont refusés avant toute lecture et avant l'insert.
  const parent = requireSingleParent(input);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  return prisma.$transaction(async (tx) => {
    const found = await findParent(tx, parent);
    applyParentExistence(errors, Boolean(found));
    const assigneeId = await resolveAssignee(tx, data.assigneeId, user, errors);
    const ownerId = await resolveOwner(tx, data.ownerId, user, errors);
    throwFieldErrors(errors);
    const columns: ParentColumns = parentColumns(parent);
    assertSingleParentColumns(columns);
    const now = new Date();
    const task = await tx.task.create({
      data: {
        ...writeData(data, assigneeId, ownerId, user.id),
        ...columns,
        completedAt: data.status === "Completed" ? now : null,
        createdById: user.id,
      },
      include: taskInclude,
    });
    await touchParentActivity(tx, parent, now);
    return toDto(task);
  });
};

const sameParent = (left: ParentRef, right: ParentRef) => left.type === right.type && left.id === right.id;

export const updateTask = async (id: string, input: unknown, user: CurrentUser): Promise<TaskDto> => {
  const existing = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!existing) throw new NotFoundError("Task not found");
  if (!canEditRecord(user, existing)) throw new AuthorizationError("You can only edit tasks you own.");
  const currentParent = parentOf(existing);
  if (mentionsParent(input)) {
    const collected = collectParentRefs(input);
    const unchanged = !collected.incoherent && collected.refs.length === 1 && sameParent(collected.refs[0], currentParent);
    if (!unchanged) throw new ValidationError({ parent: PARENT_LOCKED_MESSAGE });
  }

  const record = isRecord(input) ? input : {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(record, key);
  const merged = {
    subject: has("subject") ? record.subject : existing.subject,
    description: has("description") ? record.description : existing.description,
    status: has("status") ? record.status : existing.status,
    priority: has("priority") ? record.priority : existing.priority,
    dueDate: has("dueDate") ? record.dueDate : dateString(existing.dueDate),
    assigneeId: has("assigneeId") ? record.assigneeId : existing.assigneeId,
    ownerId: has("ownerId") ? record.ownerId : existing.ownerId,
  };
  const { data, errors } = validateTaskFields(merged, { applyDefaults: false });
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  return prisma.$transaction(async (tx) => {
    const assigneeId = await resolveAssignee(tx, data.assigneeId, user, errors);
    const ownerId = data.ownerId === existing.ownerId ? existing.ownerId : await resolveOwner(tx, data.ownerId, user, errors);
    throwFieldErrors(errors);
    const becomingComplete = data.status === "Completed" && existing.status !== "Completed";
    const reopening = data.status !== "Completed" && existing.status === "Completed";
    const now = new Date();
    const task = await tx.task.update({
      where: { id },
      data: {
        ...writeData(data, assigneeId, ownerId, user.id),
        completedAt: becomingComplete ? now : reopening ? null : existing.completedAt,
      },
      include: taskInclude,
    });
    if (becomingComplete) await touchParentActivity(tx, currentParent, now);
    return toDto(task);
  });
};

export type { ParentType };

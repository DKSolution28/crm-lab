// Filtres Opportunity. Le catalogue d'opérateurs est celui des comptes.
// Le montant est comparé comme chaîne décimale, jamais comme nombre JSON.
import { Prisma, type OpportunityStage } from "@prisma/client";
import type { FieldDefinition, FieldKind } from "../accounts/fields";
import { FilterError, type FilterOperator, type ListFilter, operatorsForField, parseFilterLogic } from "../accounts/filters";
import { AMOUNT_MESSAGE, isOpportunityStage, parseAmount } from "./validation";

export { FilterError };

type OpportunityField = {
  key: "name" | "stageName" | "amount" | "closeDate" | "probability" | "accountId";
  label: string;
  kind: FieldKind;
};

const FIELDS: Record<OpportunityField["key"], OpportunityField> = {
  name: { key: "name", label: "Opportunity Name", kind: "text" },
  stageName: { key: "stageName", label: "Stage", kind: "picklist" },
  amount: { key: "amount", label: "Amount", kind: "currency" },
  closeDate: { key: "closeDate", label: "Close Date", kind: "date" },
  probability: { key: "probability", label: "Probability", kind: "number" },
  accountId: { key: "accountId", label: "Account", kind: "text" },
};

const stub = (field: OpportunityField): FieldDefinition => ({
  key: field.key,
  label: field.label,
  kind: field.kind,
  path: field.key,
  filterable: true,
  sortable: false,
  column: false,
  origin: "designed",
});

const asText = (value: unknown, index: number): string => {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new FilterError(`filter ${index + 1}: numeric values that are not safe integers must be exact decimal strings`);
    }
    return String(value);
  }
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  throw new FilterError(`filter ${index + 1} is invalid`);
};

export const parseFiltersQuery = (raw: string | null | undefined): unknown => {
  if (!raw || !raw.trim()) return [];
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new FilterError("filters must be an array");
  }
};

export const normalizeOpportunityFilters = (input: unknown): ListFilter[] => {
  if (!Array.isArray(input)) throw new FilterError("filters must be an array");
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new FilterError(`filter ${index + 1} is invalid`);
    const { field, operator, value } = raw as Record<string, unknown>;
    const definition = typeof field === "string" ? FIELDS[field as OpportunityField["key"]] : undefined;
    if (!definition) throw new FilterError(`filter ${index + 1}: unknown or non-filterable field "${String(field)}"`);
    if (typeof operator !== "string" || !operatorsForField(stub(definition)).includes(operator as FilterOperator)) {
      throw new FilterError(`filter ${index + 1}: operator "${String(operator)}" is not available for ${definition.label}`);
    }
    let normalized: string | string[];
    if (definition.kind === "picklist") {
      const values = (Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value]).map((entry) => {
        if (typeof entry !== "string" || !isOpportunityStage(entry.trim())) {
          throw new FilterError(`filter ${index + 1}: "${String(entry)}" is not a ${definition.label} value`);
        }
        return entry.trim();
      });
      normalized = values;
    } else if (Array.isArray(value)) {
      normalized = value.map((entry) => asText(entry, index)).filter(Boolean);
    } else {
      normalized = value === undefined || value === null ? "" : asText(value, index);
    }
    if (definition.key === "amount") {
      const candidate = Array.isArray(value) ? value[0] : value;
      if (typeof candidate === "number") throw new FilterError(`filter ${index + 1}: ${AMOUNT_MESSAGE}`);
      const text = Array.isArray(normalized) ? (normalized[0] ?? "") : normalized;
      const parsed = parseAmount(text);
      if (!parsed.ok || parsed.amount === null) throw new FilterError(`filter ${index + 1}: ${AMOUNT_MESSAGE}`);
    }
    if (definition.key === "probability") {
      const text = Array.isArray(normalized) ? (normalized[0] ?? "") : normalized;
      if (!/^-?\d+$/.test(text)) throw new FilterError(`filter ${index + 1}: A whole number is required for ${definition.label}`);
      const n = Number(text);
      if (!Number.isSafeInteger(n) || n > 2147483647 || n < -2147483648) {
        throw new FilterError(`filter ${index + 1}: "${text}" is outside the integer range for ${definition.label}`);
      }
    }
    if (definition.key === "closeDate") {
      const text = Array.isArray(normalized) ? (normalized[0] ?? "") : normalized;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(utcMidnight(text).getTime())) {
        throw new FilterError(`filter ${index + 1}: "${text}" is not a date for ${definition.label}`);
      }
    }
    return { field: definition.key, operator: operator as FilterOperator, value: normalized };
  });
};

export const utcMidnight = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new FilterError(`"${value}" is not a date for Close Date`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new FilterError(`"${value}" is not a date for Close Date`);
  }
  return date;
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

type Clause = { where: Prisma.OpportunityWhereInput; sql: Prisma.Sql };

const compareSql = (column: string, operator: FilterOperator, value: Prisma.Sql): Prisma.Sql => {
  switch (operator) {
    case "equals":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} = ${value}`;
    case "not_equal_to":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} <> ${value}`;
    case "less_than":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} < ${value}`;
    case "greater_than":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} > ${value}`;
    case "less_or_equal":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} <= ${value}`;
    case "greater_or_equal":
      return Prisma.sql`${Prisma.raw(`"${column}"`)} >= ${value}`;
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const textClause = (column: "name" | "accountId", operator: FilterOperator, value: string): Clause => {
  const quoted = Prisma.raw(`"${column}"`);
  if (operator === "equals" && value === "") return { where: { [column]: null }, sql: Prisma.sql`${quoted} IS NULL` };
  if (operator === "not_equal_to" && value === "") return { where: { NOT: { [column]: null } }, sql: Prisma.sql`${quoted} IS NOT NULL` };
  const exact = escapeLike(value);
  switch (operator) {
    case "equals":
      return { where: { [column]: { equals: value, mode: "insensitive" } }, sql: Prisma.sql`${quoted} ILIKE ${exact} ESCAPE '\\'` };
    case "not_equal_to":
      return { where: { NOT: { [column]: { equals: value, mode: "insensitive" } } }, sql: Prisma.sql`${quoted} NOT ILIKE ${exact} ESCAPE '\\'` };
    case "contains":
      return {
        where: { [column]: { contains: value, mode: "insensitive" } },
        sql: Prisma.sql`${quoted} ILIKE ${`%${exact}%`} ESCAPE '\\'`,
      };
    case "does_not_contain":
      return {
        where: { NOT: { [column]: { contains: value, mode: "insensitive" } } },
        sql: Prisma.sql`${quoted} NOT ILIKE ${`%${exact}%`} ESCAPE '\\'`,
      };
    case "starts_with":
      return {
        where: { [column]: { startsWith: value, mode: "insensitive" } },
        sql: Prisma.sql`${quoted} ILIKE ${`${exact}%`} ESCAPE '\\'`,
      };
    case "less_than":
      return { where: { [column]: { lt: value } }, sql: Prisma.sql`${quoted} < ${value}` };
    case "greater_than":
      return { where: { [column]: { gt: value } }, sql: Prisma.sql`${quoted} > ${value}` };
    case "less_or_equal":
      return { where: { [column]: { lte: value } }, sql: Prisma.sql`${quoted} <= ${value}` };
    case "greater_or_equal":
      return { where: { [column]: { gte: value } }, sql: Prisma.sql`${quoted} >= ${value}` };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const stageList = (values: string[]): OpportunityStage[] => values.filter(isOpportunityStage);

const stageClause = (operator: FilterOperator, values: string[]): Clause => {
  const stages = stageList(values);
  if (stages.length === 0) return { where: {}, sql: Prisma.sql`TRUE` };
  const sqlList = Prisma.join(stages.map((stage) => Prisma.sql`CAST(${stage} AS "OpportunityStage")`));
  if (operator === "not_equal_to") {
    return { where: { stageName: { notIn: stages } }, sql: Prisma.sql`"stageName" NOT IN (${sqlList})` };
  }
  return { where: { stageName: { in: stages } }, sql: Prisma.sql`"stageName" IN (${sqlList})` };
};

const amountClause = (operator: FilterOperator, value: string): Clause => {
  const parsed = parseAmount(value);
  if (!parsed.ok || parsed.amount === null) throw new FilterError(AMOUNT_MESSAGE);
  const decimal = new Prisma.Decimal(parsed.amount);
  const valueSql = Prisma.sql`CAST(${parsed.amount} AS numeric)`;
  switch (operator) {
    case "equals":
      return { where: { amount: { equals: decimal } }, sql: compareSql("amount", operator, valueSql) };
    case "not_equal_to":
      return { where: { amount: { not: decimal } }, sql: compareSql("amount", operator, valueSql) };
    case "less_than":
      return { where: { amount: { lt: decimal } }, sql: compareSql("amount", operator, valueSql) };
    case "greater_than":
      return { where: { amount: { gt: decimal } }, sql: compareSql("amount", operator, valueSql) };
    case "less_or_equal":
      return { where: { amount: { lte: decimal } }, sql: compareSql("amount", operator, valueSql) };
    case "greater_or_equal":
      return { where: { amount: { gte: decimal } }, sql: compareSql("amount", operator, valueSql) };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const probabilityClause = (operator: FilterOperator, value: string): Clause => {
  const n = Number(value);
  return { where: probabilityWhere(operator, n), sql: compareSql("probability", operator, Prisma.sql`${n}`) };
};

const probabilityWhere = (operator: FilterOperator, n: number): Prisma.OpportunityWhereInput => {
  switch (operator) {
    case "equals":
      return { probability: { equals: n } };
    case "not_equal_to":
      return { probability: { not: n } };
    case "less_than":
      return { probability: { lt: n } };
    case "greater_than":
      return { probability: { gt: n } };
    case "less_or_equal":
      return { probability: { lte: n } };
    case "greater_or_equal":
      return { probability: { gte: n } };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const closeDateClause = (operator: FilterOperator, value: string): Clause => {
  const date = utcMidnight(value);
  switch (operator) {
    case "equals":
      return { where: { closeDate: { equals: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    case "not_equal_to":
      return { where: { closeDate: { not: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    case "less_than":
      return { where: { closeDate: { lt: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    case "greater_than":
      return { where: { closeDate: { gt: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    case "less_or_equal":
      return { where: { closeDate: { lte: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    case "greater_or_equal":
      return { where: { closeDate: { gte: date } }, sql: compareSql("closeDate", operator, Prisma.sql`${date}`) };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const filterClause = (filter: ListFilter): Clause => {
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  const single = values[0] ?? "";
  switch (filter.field) {
    case "stageName":
      return stageClause(filter.operator, values);
    case "amount":
      return amountClause(filter.operator, single);
    case "closeDate":
      return closeDateClause(filter.operator, single);
    case "probability":
      return probabilityClause(filter.operator, single);
    case "name":
      return textClause("name", filter.operator, single);
    case "accountId":
      return textClause("accountId", filter.operator, single);
    default:
      throw new FilterError(`unknown field ${filter.field}`);
  }
};

export const filtersToClause = (filters: ListFilter[], logic?: string | null): Clause => {
  if (filters.length === 0) return { where: {}, sql: Prisma.sql`TRUE` };
  const clauses = filters.map(filterClause);
  if (!logic || !logic.trim()) {
    return {
      where: { AND: clauses.map((clause) => clause.where) },
      sql: Prisma.sql`(${Prisma.join(clauses.map((clause) => clause.sql), " AND ")})`,
    };
  }
  const tree = parseFilterLogic(logic, filters.length);
  const build = (node: ReturnType<typeof parseFilterLogic>): Clause => {
    if (node.type === "ref") return clauses[node.index - 1] ?? { where: {}, sql: Prisma.sql`TRUE` };
    const children = node.children.map((child) => build(child));
    if (node.type === "and") {
      return {
        where: { AND: children.map((child) => child.where) },
        sql: Prisma.sql`(${Prisma.join(children.map((child) => child.sql), " AND ")})`,
      };
    }
    return {
      where: { OR: children.map((child) => child.where) },
      sql: Prisma.sql`(${Prisma.join(children.map((child) => child.sql), " OR ")})`,
    };
  };
  return build(tree);
};

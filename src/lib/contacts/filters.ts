// Compilation des filtres Contact. Le catalogue d'opérateurs et la logique
// restent ceux des comptes ; le where est propre à Contact.
import type { Prisma } from "@prisma/client";
import { COUNTRY_OPTIONS } from "../accounts/picklists";
import {
  FILTER_OPERATORS,
  FilterError,
  operatorLabel,
  operatorsForField,
  parseFilterLogic,
  type FilterOperator,
  type ListFilter,
} from "../accounts/filters";
import { SALUTATIONS } from "./validation";
import { CONTACT_FIELDS, asAccountField, getContactField, type ContactField } from "./fields";

export { FilterError, operatorLabel };
export type { FilterOperator, ListFilter };

const OPERATOR_SET = new Set<string>(FILTER_OPERATORS.map((operator) => operator.value));

export const operatorsForContact = (field: ContactField): FilterOperator[] => operatorsForField(asAccountField(field));

const stringifyFilterValue = (raw: unknown): string => String(raw).trim();

export const normalizeContactFilters = (input: unknown): ListFilter[] => {
  if (!Array.isArray(input)) throw new FilterError("filters must be an array");
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new FilterError(`filter ${index + 1} is invalid`);
    const { field, operator, value } = raw as Record<string, unknown>;
    const definition = typeof field === "string" ? getContactField(field) : undefined;
    if (!definition?.filterable) throw new FilterError(`filter ${index + 1}: unknown or non-filterable field "${String(field)}"`);
    if (typeof operator !== "string" || !OPERATOR_SET.has(operator)) {
      throw new FilterError(`filter ${index + 1}: unknown operator "${String(operator)}"`);
    }
    if (!operatorsForContact(definition).includes(operator as FilterOperator)) {
      throw new FilterError(`filter ${index + 1}: operator "${operator}" is not available for ${definition.label}`);
    }
    let normalizedValue: string | string[];
    if (Array.isArray(value)) normalizedValue = value.map((item) => stringifyFilterValue(item)).filter(Boolean);
    else if (value === undefined || value === null) normalizedValue = "";
    else normalizedValue = stringifyFilterValue(value);

    if (definition.kind === "salutation") {
      const values = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
      for (const item of values) {
        if (!(SALUTATIONS as readonly string[]).includes(item)) {
          throw new FilterError(`filter ${index + 1}: "${item}" is not a Salutation value`);
        }
      }
      normalizedValue = values;
    }
    if (definition.kind === "country") {
      const values = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
      for (const item of values) {
        if (!COUNTRY_OPTIONS.some((country) => country.code === item)) {
          throw new FilterError(`filter ${index + 1}: "${item}" is not a country code`);
        }
      }
      normalizedValue = values;
    }
    if (definition.kind === "state") {
      normalizedValue = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
    }
    return { field: definition.key, operator: operator as FilterOperator, value: normalizedValue };
  });
};

export const parseFiltersQuery = (raw: string | null | undefined): ListFilter[] => {
  if (!raw || !raw.trim()) return [];
  try {
    return normalizeContactFilters(JSON.parse(raw));
  } catch (error) {
    if (error instanceof FilterError) throw error;
    throw new FilterError("filters must be valid JSON");
  }
};

const setPath = (path: string, condition: unknown): Prisma.ContactWhereInput => {
  const segments = path.split(".");
  let result: unknown = condition;
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    result = index === segments.length - 1 ? { [segments[index]]: result } : { [segments[index]]: { is: result } };
  }
  return result as Prisma.ContactWhereInput;
};

const comparison = (operator: FilterOperator, value: unknown) => {
  switch (operator) {
    case "equals":
      return { equals: value };
    case "not_equal_to":
      return { not: value };
    case "less_than":
      return { lt: value };
    case "greater_than":
      return { gt: value };
    case "less_or_equal":
      return { lte: value };
    case "greater_or_equal":
      return { gte: value };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const textCondition = (operator: FilterOperator, value: string) => {
  const insensitive = { mode: "insensitive" as const };
  switch (operator) {
    case "equals":
      return value === "" ? { equals: null } : { equals: value, ...insensitive };
    case "not_equal_to":
      return value === "" ? { not: null } : { not: { equals: value, mode: "insensitive" as const } };
    case "contains":
      return { contains: value, ...insensitive };
    case "does_not_contain":
      return { not: { contains: value, mode: "insensitive" as const } };
    case "starts_with":
      return { startsWith: value, ...insensitive };
    case "less_than":
      return { lt: value };
    case "greater_than":
      return { gt: value };
    case "less_or_equal":
      return { lte: value };
    case "greater_or_equal":
      return { gte: value };
    default:
      throw new FilterError(`operator ${operator} is not comparable`);
  }
};

const parseDate = (value: string, label: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new FilterError(`"${value}" is not a date for ${label}`);
  return date;
};

export const contactFilterToWhere = (filter: ListFilter): Prisma.ContactWhereInput => {
  const field = getContactField(filter.field);
  if (!field) throw new FilterError(`unknown field ${filter.field}`);
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  const single = values[0] ?? "";
  switch (field.kind) {
    case "salutation":
    case "country":
    case "state": {
      if (values.length === 0) return {};
      const condition = filter.operator === "not_equal_to" ? { notIn: values } : { in: values };
      return setPath(field.path, condition);
    }
    case "datetime": {
      const date = parseDate(single, field.label);
      if ((filter.operator === "equals" || filter.operator === "not_equal_to") && /^\d{4}-\d{2}-\d{2}$/.test(single)) {
        const end = new Date(date);
        end.setUTCDate(end.getUTCDate() + 1);
        const range = { gte: date, lt: end };
        return filter.operator === "equals" ? setPath(field.path, range) : { NOT: setPath(field.path, range) };
      }
      return setPath(field.path, comparison(filter.operator, date));
    }
    default:
      return setPath(field.path, textCondition(filter.operator, single));
  }
};

export const contactsToWhere = (filters: ListFilter[], logic?: string | null): Prisma.ContactWhereInput => {
  if (filters.length === 0) {
    if (logic && logic.trim()) throw new FilterError("filter logic must reference filter 1");
    return {};
  }
  const clauses = filters.map(contactFilterToWhere);
  if (!logic || !logic.trim()) return { AND: clauses };
  const tree = parseFilterLogic(logic, filters.length);
  const build = (node: ReturnType<typeof parseFilterLogic>): Prisma.ContactWhereInput => {
    if (node.type === "ref") return clauses[node.index - 1];
    return node.type === "and" ? { AND: node.children.map(build) } : { OR: node.children.map(build) };
  };
  return build(tree);
};

export const contactFilterFields = () =>
  CONTACT_FIELDS.filter((field) => field.filterable).map((field) => ({
    key: field.key,
    label: field.label,
    operators: operatorsForContact(field).map((value) => ({ value, label: operatorLabel(value) })),
  }));

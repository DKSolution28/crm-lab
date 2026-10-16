// Compilateur de filtres Lead. Le catalogue d'opérateurs reste celui des comptes.
import type { Prisma } from "@prisma/client";
import { FILTER_OPERATORS, FilterError, operatorsForField, parseFilterLogic, type FilterOperator, type ListFilter } from "../accounts/filters";
import { LEAD_STATUS_VALUES } from "./validation";
import { getLeadField, leadFieldDefinition, type LeadField } from "./fields";

export { FilterError, type ListFilter };

const OPERATOR_SET = new Set<string>(FILTER_OPERATORS.map((operator) => operator.value));

export type LeadScope = "all" | "mine" | "recent";

export type LeadListQuery = {
  q: string | null;
  sortField: string | null;
  sortDirection: "asc" | "desc" | null;
  page: number;
  pageSize: number;
  scope: LeadScope;
  filters: ListFilter[];
  filterLogic: string | null;
};

const stringifyFilterValue = (raw: unknown, index: number): string => {
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (typeof raw === "string") return raw.trim();
  throw new FilterError(`filter ${index + 1}: value must be a string or a list of strings`);
};

export const normalizeLeadFilters = (input: unknown): ListFilter[] => {
  if (!Array.isArray(input)) throw new FilterError("filters must be an array");
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new FilterError(`filter ${index + 1} is invalid`);
    const { field, operator, value } = raw as Record<string, unknown>;
    const definition = typeof field === "string" ? getLeadField(field) : undefined;
    if (!definition?.filterable) {
      throw new FilterError(`filter ${index + 1}: unknown or non-filterable field "${String(field)}"`);
    }
    if (typeof operator !== "string" || !OPERATOR_SET.has(operator)) {
      throw new FilterError(`filter ${index + 1}: unknown operator "${String(operator)}"`);
    }
    if (!operatorsForField(leadFieldDefinition(definition)).includes(operator as FilterOperator)) {
      throw new FilterError(`filter ${index + 1}: operator "${operator}" is not available for ${definition.label}`);
    }
    let normalized: string | string[];
    if (Array.isArray(value)) normalized = value.map((item) => stringifyFilterValue(item, index)).filter(Boolean);
    else if (value === undefined || value === null) normalized = "";
    else normalized = stringifyFilterValue(value, index);

    if (definition.kind === "picklist") {
      const values = Array.isArray(normalized) ? normalized : normalized ? [normalized] : [];
      for (const item of values) {
        if (!(LEAD_STATUS_VALUES as readonly string[]).includes(item)) {
          throw new FilterError(`filter ${index + 1}: "${item}" is not a ${definition.label} value`);
        }
      }
      return { field: definition.key, operator: operator as FilterOperator, value: values };
    }
    const single = Array.isArray(normalized) ? (normalized[0] ?? "") : normalized;
    return { field: definition.key, operator: operator as FilterOperator, value: single };
  });
};

const setPath = (path: string, condition: unknown): Prisma.LeadWhereInput => {
  const segments = path.split(".");
  let result: unknown = condition;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    result = i === segments.length - 1 ? { [segments[i]]: result } : { [segments[i]]: { is: result } };
  }
  return result as Prisma.LeadWhereInput;
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
  }
};

const filterToWhere = (filter: ListFilter, field: LeadField): Prisma.LeadWhereInput => {
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  const single = values[0] ?? "";
  if (field.kind === "picklist") {
    if (values.length === 0) return {};
    const condition = filter.operator === "not_equal_to" ? { notIn: values } : { in: values };
    return setPath(field.path, condition);
  }
  if (field.kind === "boolean") {
    const flag = /^(true|1|yes|oui)$/i.test(single);
    return setPath(field.path, filter.operator === "not_equal_to" ? { not: flag } : { equals: flag });
  }
  return setPath(field.path, textCondition(filter.operator, single));
};

export const leadFiltersToWhere = (filters: ListFilter[], logic?: string | null): Prisma.LeadWhereInput => {
  if (filters.length === 0) return {};
  const clauses = filters.map((filter) => {
    const field = getLeadField(filter.field);
    if (!field?.filterable) throw new FilterError(`unknown field ${filter.field}`);
    return filterToWhere(filter, field);
  });
  if (!logic || !logic.trim()) return { AND: clauses };
  const tree = parseFilterLogic(logic, filters.length);
  const build = (node: ReturnType<typeof parseFilterLogic>): Prisma.LeadWhereInput => {
    if (node.type === "ref") return clauses[node.index - 1];
    return node.type === "and" ? { AND: node.children.map(build) } : { OR: node.children.map(build) };
  };
  return build(tree);
};

const positiveInt = (raw: string | null, fallback: number) => {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
};

export const readLeadListQuery = (params: URLSearchParams): LeadListQuery => {
  const scopeRaw = (params.get("scope") ?? "all").trim() || "all";
  if (scopeRaw !== "all" && scopeRaw !== "mine" && scopeRaw !== "recent") {
    throw new FilterError(`scope "${scopeRaw}" is not valid. Use all, mine, or recent.`);
  }
  const dir = params.get("dir");
  if (dir && dir !== "asc" && dir !== "desc") {
    throw new FilterError(`dir "${dir}" is not valid. Use asc or desc.`);
  }
  const filtersRaw = params.get("filters");
  let filters: ListFilter[] = [];
  if (filtersRaw && filtersRaw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(filtersRaw);
    } catch {
      throw new FilterError("filters must be a JSON array");
    }
    filters = normalizeLeadFilters(parsed);
  }
  const filterLogic = params.get("filterLogic");
  if (filters.length > 0 && filterLogic && filterLogic.trim()) parseFilterLogic(filterLogic, filters.length);
  return {
    q: params.get("q"),
    sortField: params.get("sort"),
    sortDirection: dir === "desc" ? "desc" : dir === "asc" ? "asc" : null,
    page: positiveInt(params.get("page"), 1),
    pageSize: positiveInt(params.get("pageSize"), 50),
    scope: scopeRaw,
    filters,
    filterLogic,
  };
};

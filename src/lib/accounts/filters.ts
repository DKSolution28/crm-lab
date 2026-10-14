// Filtres de vue de liste : opérateurs observés (FLT-2), logique ET par défaut
// et expression personnalisée « Add Filter Logic » (ex. 1 AND (2 OR 3)).
import type { Prisma } from "@prisma/client";
import { getField, type FieldDefinition } from "./fields";
import { COUNTRY_OPTIONS, isPicklistValue } from "./picklists";

export const FILTER_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equal_to", label: "not equal to" },
  { value: "less_than", label: "less than" },
  { value: "greater_than", label: "greater than" },
  { value: "less_or_equal", label: "less or equal" },
  { value: "greater_or_equal", label: "greater or equal" },
  { value: "contains", label: "contains" },
  { value: "does_not_contain", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number]["value"];

export type ListFilter = {
  field: string;
  operator: FilterOperator;
  /** Texte saisi, ou liste de valeurs pour les picklists (multi-sélection observée). */
  value: string | string[];
};

export class FilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilterError";
  }
}

const OPERATOR_SET = new Set<string>(FILTER_OPERATORS.map((o) => o.value));

/** Opérateurs proposés selon le type de champ (déduit pour les types non texte). */
export const operatorsForField = (field: FieldDefinition): FilterOperator[] => {
  switch (field.kind) {
    case "picklist":
    case "country":
    case "state":
    case "boolean":
      return ["equals", "not_equal_to"];
    case "number":
    case "currency":
    case "date":
    case "datetime":
      return ["equals", "not_equal_to", "less_than", "greater_than", "less_or_equal", "greater_or_equal"];
    default:
      return FILTER_OPERATORS.map((o) => o.value);
  }
};

export const normalizeFilters = (input: unknown): ListFilter[] => {
  if (!Array.isArray(input)) throw new FilterError("filters must be an array");
  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new FilterError(`filter ${index + 1} is invalid`);
    const { field, operator, value } = raw as Record<string, unknown>;
    if (typeof field !== "string" || !getField(field)?.filterable) {
      throw new FilterError(`filter ${index + 1}: unknown or non-filterable field "${String(field)}"`);
    }
    if (typeof operator !== "string" || !OPERATOR_SET.has(operator)) {
      throw new FilterError(`filter ${index + 1}: unknown operator "${String(operator)}"`);
    }
    const definition = getField(field)!;
    if (!operatorsForField(definition).includes(operator as FilterOperator)) {
      throw new FilterError(`filter ${index + 1}: operator "${operator}" is not available for ${definition.label}`);
    }
    let normalizedValue: string | string[];
    if (Array.isArray(value)) {
      normalizedValue = value.map((v) => String(v).trim()).filter(Boolean);
    } else if (value === undefined || value === null) {
      normalizedValue = "";
    } else {
      normalizedValue = String(value).trim();
    }
    if (definition.kind === "picklist" && definition.picklist) {
      const values = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
      for (const v of values) {
        if (!isPicklistValue(definition.picklist, v)) throw new FilterError(`filter ${index + 1}: "${v}" is not a ${definition.label} value`);
      }
      normalizedValue = values;
    }
    if (definition.kind === "country") {
      const values = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
      for (const v of values) {
        if (!COUNTRY_OPTIONS.some((c) => c.code === v)) throw new FilterError(`filter ${index + 1}: "${v}" is not a country code`);
      }
      normalizedValue = values;
    }
    if (definition.kind === "state") {
      normalizedValue = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];
    }
    return { field, operator: operator as FilterOperator, value: normalizedValue };
  });
};

// ---------------------------------------------------------------------------
// Logique de filtre : grammaire  expr := term (OR term)* ; term := factor (AND factor)* ;
// factor := NUMBER | '(' expr ')'
// ---------------------------------------------------------------------------

type LogicNode = { type: "ref"; index: number } | { type: "and" | "or"; children: LogicNode[] };

export const parseFilterLogic = (logic: string, filterCount: number): LogicNode => {
  const tokens = logic
    .toUpperCase()
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) throw new FilterError("filter logic is empty");
  let position = 0;
  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const used = new Set<number>();

  const parseFactor = (): LogicNode => {
    const token = next();
    if (token === undefined) throw new FilterError("filter logic ends unexpectedly");
    if (token === "(") {
      const node = parseExpr();
      if (next() !== ")") throw new FilterError("filter logic: missing closing parenthesis");
      return node;
    }
    if (!/^\d+$/.test(token)) throw new FilterError(`filter logic: unexpected token "${token}"`);
    const index = Number(token);
    if (index < 1 || index > filterCount) throw new FilterError(`filter logic: filter ${index} does not exist`);
    used.add(index);
    return { type: "ref", index };
  };
  const parseTerm = (): LogicNode => {
    const children = [parseFactor()];
    while (peek() === "AND") {
      next();
      children.push(parseFactor());
    }
    return children.length === 1 ? children[0] : { type: "and", children };
  };
  const parseExpr = (): LogicNode => {
    const children = [parseTerm()];
    while (peek() === "OR") {
      next();
      children.push(parseTerm());
    }
    return children.length === 1 ? children[0] : { type: "or", children };
  };

  const tree = parseExpr();
  if (position !== tokens.length) throw new FilterError(`filter logic: unexpected token "${tokens[position]}"`);
  for (let i = 1; i <= filterCount; i += 1) {
    if (!used.has(i)) throw new FilterError(`filter logic must reference filter ${i}`);
  }
  return tree;
};

// ---------------------------------------------------------------------------
// Conversion en clause Prisma
// ---------------------------------------------------------------------------

const setPath = (path: string, condition: unknown): Prisma.AccountWhereInput => {
  const segments = path.split(".");
  let result: unknown = condition;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    result = i === segments.length - 1 ? { [segments[i]]: result } : { [segments[i]]: { is: result } };
  }
  return result as Prisma.AccountWhereInput;
};

const parseNumber = (value: string, field: FieldDefinition) => {
  const n = Number(value.replace(/[\s,]/g, ""));
  if (!Number.isFinite(n)) throw new FilterError(`"${value}" is not a number for ${field.label}`);
  return n;
};

const parseDate = (value: string, field: FieldDefinition) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new FilterError(`"${value}" is not a date for ${field.label}`);
  return d;
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
  }
};

export const filterToWhere = (filter: ListFilter): Prisma.AccountWhereInput => {
  const field = getField(filter.field);
  if (!field) throw new FilterError(`unknown field ${filter.field}`);
  const values = Array.isArray(filter.value) ? filter.value : [filter.value];
  const single = values[0] ?? "";

  switch (field.kind) {
    case "picklist":
    case "country":
    case "state": {
      if (values.length === 0) return {};
      const condition = filter.operator === "not_equal_to" ? { notIn: values } : { in: values };
      return setPath(field.path, condition);
    }
    case "boolean": {
      const bool = /^(true|1|yes|oui)$/i.test(single);
      return setPath(field.path, filter.operator === "not_equal_to" ? { not: bool } : { equals: bool });
    }
    case "number":
    case "currency":
      return setPath(field.path, comparison(filter.operator, parseNumber(single, field)));
    case "date":
    case "datetime": {
      const date = parseDate(single, field);
      if (field.kind === "datetime" && (filter.operator === "equals" || filter.operator === "not_equal_to") && /^\d{4}-\d{2}-\d{2}$/.test(single)) {
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

export const filtersToWhere = (filters: ListFilter[], logic?: string | null): Prisma.AccountWhereInput => {
  if (filters.length === 0) return {};
  const clauses = filters.map(filterToWhere);
  if (!logic || !logic.trim()) return { AND: clauses };
  const tree = parseFilterLogic(logic, filters.length);
  const build = (node: LogicNode): Prisma.AccountWhereInput => {
    if (node.type === "ref") return clauses[node.index - 1];
    return node.type === "and" ? { AND: node.children.map(build) } : { OR: node.children.map(build) };
  };
  return build(tree);
};

export const operatorLabel = (operator: FilterOperator) => FILTER_OPERATORS.find((o) => o.value === operator)?.label ?? operator;

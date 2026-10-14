import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilterError, filtersToWhere, normalizeFilters, operatorsForField, parseFilterLogic } from "../../src/lib/accounts/filters";
import { requireField } from "../../src/lib/accounts/fields";

describe("normalizeFilters", () => {
  it("accepts text, picklist and country filters", () => {
    const filters = normalizeFilters([
      { field: "name", operator: "contains", value: " north " },
      { field: "type", operator: "equals", value: ["Customer", "Partner"] },
      { field: "billingCountryCode", operator: "equals", value: "US" },
    ]);
    assert.deepEqual(filters, [
      { field: "name", operator: "contains", value: "north" },
      { field: "type", operator: "equals", value: ["Customer", "Partner"] },
      { field: "billingCountryCode", operator: "equals", value: ["US"] },
    ]);
  });

  it("rejects unknown fields, operators and picklist values", () => {
    assert.throws(() => normalizeFilters([{ field: "nope", operator: "equals", value: "x" }]), FilterError);
    assert.throws(() => normalizeFilters([{ field: "name", operator: "between", value: "x" }]), FilterError);
    assert.throws(() => normalizeFilters([{ field: "type", operator: "contains", value: "Customer" }]), FilterError);
    assert.throws(() => normalizeFilters([{ field: "type", operator: "equals", value: "NotAType" }]), FilterError);
    assert.throws(() => normalizeFilters([{ field: "billingCountryCode", operator: "equals", value: "ZZ" }]), FilterError);
    assert.throws(() => normalizeFilters("not an array"), FilterError);
  });
});

describe("operatorsForField", () => {
  it("offers the observed text operators and restricted operators for picklists/numbers", () => {
    assert.deepEqual(operatorsForField(requireField("name")), [
      "equals",
      "not_equal_to",
      "less_than",
      "greater_than",
      "less_or_equal",
      "greater_or_equal",
      "contains",
      "does_not_contain",
      "starts_with",
    ]);
    assert.deepEqual(operatorsForField(requireField("type")), ["equals", "not_equal_to"]);
    assert.deepEqual(operatorsForField(requireField("annualRevenue")), ["equals", "not_equal_to", "less_than", "greater_than", "less_or_equal", "greater_or_equal"]);
  });
});

describe("parseFilterLogic", () => {
  it("parses AND / OR / parentheses", () => {
    assert.deepEqual(parseFilterLogic("1 AND (2 OR 3)", 3), {
      type: "and",
      children: [
        { type: "ref", index: 1 },
        { type: "or", children: [{ type: "ref", index: 2 }, { type: "ref", index: 3 }] },
      ],
    });
  });

  it("is case-insensitive and tolerates spacing", () => {
    assert.deepEqual(parseFilterLogic("1 and 2", 2), { type: "and", children: [{ type: "ref", index: 1 }, { type: "ref", index: 2 }] });
    assert.deepEqual(parseFilterLogic("(1)", 1), { type: "ref", index: 1 });
  });

  it("rejects references out of range, missing references and malformed expressions", () => {
    assert.throws(() => parseFilterLogic("1 AND 4", 3), FilterError);
    assert.throws(() => parseFilterLogic("1 AND 2", 3), FilterError);
    assert.throws(() => parseFilterLogic("1 AND", 1), FilterError);
    assert.throws(() => parseFilterLogic("(1 OR 2", 2), FilterError);
    assert.throws(() => parseFilterLogic("1 2", 2), FilterError);
  });
});

describe("filtersToWhere", () => {
  it("combines filters with AND by default", () => {
    const where = filtersToWhere([
      { field: "name", operator: "starts_with", value: "No" },
      { field: "type", operator: "not_equal_to", value: ["Prospect"] },
    ]);
    assert.deepEqual(where, {
      AND: [{ name: { startsWith: "No", mode: "insensitive" } }, { type: { notIn: ["Prospect"] } }],
    });
  });

  it("applies a custom filter logic expression", () => {
    const where = filtersToWhere(
      [
        { field: "billingCountryCode", operator: "equals", value: ["US"] },
        { field: "type", operator: "equals", value: ["Customer"] },
        { field: "type", operator: "equals", value: ["Partner"] },
      ],
      "1 AND (2 OR 3)",
    );
    assert.deepEqual(where, {
      AND: [{ billingCountryCode: { in: ["US"] } }, { OR: [{ type: { in: ["Customer"] } }, { type: { in: ["Partner"] } }] }],
    });
  });

  it("builds numeric, boolean, relation and date-range conditions", () => {
    assert.deepEqual(filtersToWhere([{ field: "annualRevenue", operator: "greater_than", value: "1,000,000" }]), { AND: [{ annualRevenue: { gt: 1000000 } }] });
    assert.deepEqual(filtersToWhere([{ field: "isBuyer", operator: "equals", value: "true" }]), { AND: [{ isBuyer: { equals: true } }] });
    assert.deepEqual(filtersToWhere([{ field: "ownerAlias", operator: "equals", value: "demoadm" }]), { AND: [{ owner: { is: { alias: { equals: "demoadm", mode: "insensitive" } } } }] });
    const created = filtersToWhere([{ field: "createdAt", operator: "equals", value: "2026-10-14" }]);
    const range = (created.AND as Array<{ createdAt: { gte: Date; lt: Date } }>)[0].createdAt;
    assert.equal(range.gte.toISOString(), "2026-10-14T00:00:00.000Z");
    assert.equal(range.lt.toISOString(), "2026-10-15T00:00:00.000Z");
  });

  it("rejects invalid numbers and dates", () => {
    assert.throws(() => filtersToWhere([{ field: "annualRevenue", operator: "equals", value: "abc" }]), FilterError);
    assert.throws(() => filtersToWhere([{ field: "createdAt", operator: "less_than", value: "not-a-date" }]), FilterError);
  });

  it("returns an empty where without filters", () => {
    assert.deepEqual(filtersToWhere([]), {});
    assert.deepEqual(filtersToWhere([], "1"), {});
  });
});

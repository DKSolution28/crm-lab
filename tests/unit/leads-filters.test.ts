import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilterError, leadFiltersToWhere, normalizeLeadFilters, readLeadListQuery } from "../../src/lib/leads/filters";

describe("lead list filters", () => {
  it("compiles status and qualified filters and rejects illegal operators", () => {
    const filters = normalizeLeadFilters([
      { field: "status", operator: "equals", value: "Working" },
      { field: "qualified", operator: "equals", value: "true" },
    ]);
    assert.deepEqual(leadFiltersToWhere(filters, "1 AND 2"), {
      AND: [{ status: { in: ["Working"] } }, { qualified: { equals: true } }],
    });
    assert.throws(() => normalizeLeadFilters([{ field: "status", operator: "contains", value: "New" }]), FilterError);
    assert.throws(() => normalizeLeadFilters([{ field: "status", operator: "equals", value: "Nope" }]), FilterError);
  });

  it("reads scope, sort and page bounds from the query string", () => {
    const query = readLeadListQuery(new URLSearchParams("scope=mine&sort=company&dir=desc&page=2&pageSize=500&q=lantern"));
    assert.equal(query.scope, "mine");
    assert.equal(query.sortField, "company");
    assert.equal(query.sortDirection, "desc");
    assert.equal(query.page, 2);
    assert.equal(query.pageSize, 500);
    assert.equal(query.q, "lantern");
    assert.throws(() => readLeadListQuery(new URLSearchParams("scope=shared")), FilterError);
    assert.throws(() => readLeadListQuery(new URLSearchParams("filters=not-json")), FilterError);
  });
});

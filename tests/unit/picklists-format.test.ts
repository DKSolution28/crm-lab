import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACCOUNT_FIELDS, DEFAULT_COLUMNS, KANBAN_GROUP_FIELDS, getField, requireField } from "../../src/lib/accounts/fields";
import { formatAddress, formatCurrency, formatFieldValue } from "../../src/lib/accounts/format";
import {
  ACCOUNT_SOURCE_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  OWNERSHIP_OPTIONS,
  RATING_OPTIONS,
  findState,
  isActivePicklistValue,
  isPicklistValue,
  picklistLabel,
} from "../../src/lib/accounts/picklists";
import { groupForKanban, orderByFor, startOfWeek, type AccountDto } from "../../src/lib/accounts/service";

const user = { id: "u1", alias: "demoadm", firstName: "Demo", lastName: "Admin" };

const account = (overrides: Partial<AccountDto> = {}): AccountDto =>
  ({
    id: "a1",
    name: "Northwind Traders",
    accountNumber: null,
    site: null,
    accountSource: null,
    annualRevenue: "1250000",
    type: "Customer",
    industry: "Retail",
    ownership: null,
    rating: null,
    description: null,
    website: "https://example.test",
    tickerSymbol: null,
    sic: null,
    sicDesc: null,
    jigsaw: null,
    tier: null,
    numberOfEmployees: 120,
    isBuyer: true,
    isCustomerPortal: false,
    phone: null,
    fax: null,
    billingStreet: "1 Market St",
    billingCity: "Seattle",
    billingState: "Washington",
    billingStateCode: "WA",
    billingPostalCode: "98101",
    billingCountry: "United States",
    billingCountryCode: "US",
    shippingStreet: null,
    shippingCity: null,
    shippingState: null,
    shippingStateCode: null,
    shippingPostalCode: null,
    shippingCountry: null,
    shippingCountryCode: null,
    parentId: null,
    ownerId: "u1",
    createdById: "u1",
    lastModifiedById: "u1",
    lastActivityDate: null,
    createdAt: "2026-10-14T10:00:00.000Z",
    updatedAt: "2026-10-14T10:00:00.000Z",
    owner: user,
    createdBy: { alias: "demoadm" },
    lastModifiedBy: { alias: "demoadm" },
    parent: null,
    ...overrides,
  }) as AccountDto;

describe("picklists (observed in Object Manager)", () => {
  it("exposes the observed value sets", () => {
    assert.equal(ACCOUNT_TYPE_OPTIONS.length, 10);
    assert.equal(INDUSTRY_OPTIONS.filter((o) => o.active).length, 32);
    assert.equal(INDUSTRY_OPTIONS.filter((o) => !o.active).length, 3);
    assert.equal(ACCOUNT_SOURCE_OPTIONS.length, 11);
    assert.equal(RATING_OPTIONS.length, 3);
    assert.equal(OWNERSHIP_OPTIONS.length, 4);
  });

  it("distinguishes valid, active and inactive values", () => {
    assert.equal(isPicklistValue("industry", "Banking"), true);
    assert.equal(isActivePicklistValue("industry", "Banking"), true);
    assert.equal(isPicklistValue("industry", "Advertising"), true);
    assert.equal(isActivePicklistValue("industry", "Advertising"), false);
    assert.equal(isPicklistValue("type", "Supplier"), false);
    assert.equal(picklistLabel("type", "Channel Partner / Reseller"), "Channel Partner / Reseller");
    assert.equal(picklistLabel("accountSource", "WordOfMouth"), "Word of mouth");
  });

  it("resolves states only within their country", () => {
    assert.equal(findState("US", "CA")?.label, "California");
    assert.equal(findState("CA", "CA"), undefined);
    assert.equal(findState("FR", "CA"), undefined);
  });
});

describe("field catalog", () => {
  it("keeps the 27 observed Account fields plus relation keys", () => {
    const observed = ACCOUNT_FIELDS.filter((f) => f.origin === "observed");
    assert.ok(observed.length >= 27, `expected at least 27 observed fields, got ${observed.length}`);
    assert.ok(DEFAULT_COLUMNS.every((key) => getField(key)));
    assert.ok(KANBAN_GROUP_FIELDS.every((key) => getField(key)));
    assert.throws(() => requireField("missing"));
  });
});

describe("formatting", () => {
  it("formats currency, picklists, booleans and addresses", () => {
    assert.equal(formatCurrency("1250000"), "$1,250,000");
    assert.equal(formatCurrency(null), "");
    const a = account();
    assert.equal(formatFieldValue(a, "annualRevenue"), "$1,250,000");
    assert.equal(formatFieldValue(a, "isBuyer"), "Yes");
    assert.equal(formatFieldValue(a, "type"), "Customer");
    assert.equal(formatFieldValue(a, "billingStateCode"), "Washington");
    assert.equal(formatFieldValue(a, "billingCountryCode"), "United States");
    assert.equal(formatFieldValue(a, "ownerAlias"), "demoadm");
    assert.equal(formatFieldValue(a, "numberOfEmployees"), "120");
    assert.equal(formatAddress(a, "billing"), "1 Market St\nSeattle, Washington, 98101\nUnited States");
    assert.equal(formatAddress(a, "shipping"), "");
  });
});

describe("service helpers", () => {
  it("computes the Monday of the current week in UTC", () => {
    assert.equal(startOfWeek(new Date("2026-10-14T15:00:00Z")).toISOString(), "2026-10-12T00:00:00.000Z");
    assert.equal(startOfWeek(new Date("2026-10-18T23:00:00Z")).toISOString(), "2026-10-12T00:00:00.000Z");
    assert.equal(startOfWeek(new Date("2026-10-12T00:00:00Z")).toISOString(), "2026-10-12T00:00:00.000Z");
  });

  it("builds order-by clauses for direct and relation fields and falls back to name", () => {
    assert.deepEqual(orderByFor("ownerAlias", "desc"), [{ owner: { alias: "desc" } }, { id: "asc" }]);
    assert.deepEqual(orderByFor("phone", "asc"), [{ phone: "asc" }, { id: "asc" }]);
    assert.deepEqual(orderByFor("unknown", "asc"), [{ name: "asc" }]);
  });

  it("groups accounts for the Kanban board and sums the summary field", () => {
    const items = [
      account({ id: "1", type: "Customer", annualRevenue: "100" }),
      account({ id: "2", type: "Partner", annualRevenue: "50" }),
      account({ id: "3", type: "Customer", annualRevenue: null }),
      account({ id: "4", type: null, annualRevenue: "7" }),
    ];
    const columns = groupForKanban(items, "type", "annualRevenue");
    assert.deepEqual(
      columns.map((c) => [c.label, c.items.length, c.summary]),
      [
        ["Customer", 2, 100],
        ["Partner", 1, 50],
        ["(None)", 1, 7],
      ],
    );
    const byOwner = groupForKanban(items, "ownerAlias", null);
    assert.equal(byOwner.length, 1);
    assert.equal(byOwner[0].summary, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilterError, contactsToWhere, normalizeContactFilters, parseFiltersQuery } from "../../src/lib/contacts/filters";
import { REQUIRED_MESSAGE, contactInputFromFormData, contactInputFromJson, validateContactInput } from "../../src/lib/contacts/validation";

describe("validateContactInput", () => {
  it("requires Last Name with the observed message and leaves accountId optional", () => {
    const missing = validateContactInput({ lastName: "   " });
    assert.equal(missing.errors.lastName, REQUIRED_MESSAGE);
    assert.equal(missing.errors.lastName, "Complete this field.");
    assert.equal(missing.errors.accountId, undefined);

    const minimal = validateContactInput({ lastName: "Lovelace" });
    assert.deepEqual(minimal.errors, {});
    assert.equal(minimal.data.lastName, "Lovelace");
    assert.equal(minimal.data.accountId, null);
    assert.equal(minimal.data.reportsToId, null);
    assert.equal(minimal.data.salutation, null);
    assert.equal(minimal.data.email, null);
  });

  it("accepts the designed salutation values and rejects anything else", () => {
    for (const salutation of ["Mr", "Ms", "Dr", "Mx"]) {
      const result = validateContactInput({ lastName: "Lovelace", salutation });
      assert.equal(result.errors.salutation, undefined);
      assert.equal(result.data.salutation, salutation);
    }
    const bad = validateContactInput({ lastName: "Lovelace", salutation: "Lord" });
    assert.equal(bad.errors.salutation, `"Lord" is not a valid Salutation value.`);
    assert.equal(bad.data.salutation, null);
  });

  it("does not check email or phone format and enforces designed lengths", () => {
    const loose = validateContactInput({ lastName: "Lovelace", email: "not-an-email", phone: "abc" });
    assert.deepEqual(loose.errors, {});
    assert.equal(loose.data.email, "not-an-email");
    assert.equal(loose.data.phone, "abc");

    const tooLong = validateContactInput({ lastName: "L".repeat(81), title: "T".repeat(129), email: "a".repeat(256) });
    assert.equal(tooLong.errors.lastName, "Maximum length is 80 characters.");
    assert.equal(tooLong.errors.title, "Maximum length is 128 characters.");
    assert.equal(tooLong.errors.email, "Maximum length is 255 characters.");
  });

  it("reuses Account country and state options for the mailing address", () => {
    const ok = validateContactInput({ lastName: "Lovelace", mailingCountryCode: "US", mailingStateCode: "WA", mailingCity: "Seattle" });
    assert.deepEqual(ok.errors, {});
    assert.equal(ok.data.mailingCountryCode, "US");
    assert.equal(ok.data.mailingCountry, "United States");
    assert.equal(ok.data.mailingStateCode, "WA");
    assert.equal(ok.data.mailingState, "Washington");

    const stateFirst = validateContactInput({ lastName: "Lovelace", mailingStateCode: "WA" });
    assert.equal(stateFirst.errors.mailingStateCode, "Select a country before a state/province.");

    const france = validateContactInput({ lastName: "Lovelace", mailingCountryCode: "FR", mailingStateCode: "WA" });
    assert.equal(france.errors.mailingStateCode, "France has no state/province values.");
    assert.equal(france.data.mailingCountry, "France");

    const unknown = validateContactInput({ lastName: "Lovelace", mailingCountryCode: "ZZ" });
    assert.equal(unknown.errors.mailingCountryCode, "Select a country from the list.");
    assert.equal(unknown.data.mailingCountryCode, null);
  });

  it("reads form data and JSON without inventing an account", () => {
    const form = new FormData();
    form.set("lastName", " Hopper ");
    form.set("accountId", "");
    form.set("salutation", "Dr");
    const fromForm = contactInputFromFormData(form);
    assert.equal(fromForm.lastName, " Hopper ");
    assert.equal(fromForm.accountId, "");
    assert.equal(validateContactInput(fromForm).data.accountId, null);

    const fromJson = contactInputFromJson({ lastName: "Hopper", accountId: null, email: "grace@example" });
    assert.equal(fromJson.accountId, null);
    assert.equal(fromJson.email, "grace@example");
    assert.deepEqual(contactInputFromJson(null), { lastName: "" });
  });
});

describe("contact filters", () => {
  it("searches text fields case-insensitively and compiles filter logic", () => {
    const filters = normalizeContactFilters([
      { field: "lastName", operator: "contains", value: "Love" },
      { field: "email", operator: "starts_with", value: "ada" },
    ]);
    const where = contactsToWhere(filters, "1 AND 2");
    assert.deepEqual(where, {
      AND: [
        { lastName: { contains: "Love", mode: "insensitive" } },
        { email: { startsWith: "ada", mode: "insensitive" } },
      ],
    });
  });

  it("rejects unknown fields, illegal operators, bad salutations and invalid JSON", () => {
    assert.throws(() => normalizeContactFilters([{ field: "name", operator: "equals", value: "A" }]), (error: unknown) => {
      assert.ok(error instanceof FilterError);
      assert.match(error.message, /unknown or non-filterable field/);
      return true;
    });
    assert.throws(() => normalizeContactFilters([{ field: "salutation", operator: "contains", value: "Ms" }]), /not available for Salutation/);
    assert.throws(() => normalizeContactFilters([{ field: "salutation", operator: "equals", value: "Lord" }]), /not a Salutation value/);
    assert.throws(() => normalizeContactFilters([{ field: "mailingCountryCode", operator: "equals", value: "ZZ" }]), /not a country code/);
    assert.throws(() => parseFiltersQuery("{"), /valid JSON/);
    assert.throws(() => parseFiltersQuery("null"), /filters must be an array/);
    assert.deepEqual(parseFiltersQuery("  "), []);
  });

  it("compares created dates and keeps an empty filter list inert", () => {
    const where = contactsToWhere(normalizeContactFilters([{ field: "createdAt", operator: "greater_than", value: "2020-01-01T00:00:00.000Z" }]), null);
    assert.deepEqual(where, { AND: [{ createdAt: { gt: new Date("2020-01-01T00:00:00.000Z") } }] });
    assert.deepEqual(contactsToWhere([], null), {});
    assert.throws(() => contactsToWhere([], "1 OR 2"), /filter logic must reference filter 1/);
  });
});

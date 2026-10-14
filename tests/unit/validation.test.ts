import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REQUIRED_MESSAGE, accountInputFromFormData, accountInputFromJson, validateAccountInput } from "../../src/lib/accounts/validation";

describe("validateAccountInput", () => {
  it("requires Account Name with the observed message", () => {
    const { errors } = validateAccountInput({ name: "   " });
    assert.equal(errors.name, REQUIRED_MESSAGE);
  });

  it("accepts a minimal account (only the name is required)", () => {
    const { data, errors } = validateAccountInput({ name: "Northwind Traders" });
    assert.deepEqual(errors, {});
    assert.equal(data.name, "Northwind Traders");
    assert.equal(data.type, null);
    assert.equal(data.isBuyer, false);
    assert.equal(data.billingCountry, null);
  });

  it("validates picklist values and rejects inactive ones", () => {
    const ok = validateAccountInput({ name: "A", type: "Customer", industry: "Agriculture", rating: "Hot", ownership: "Public", accountSource: "Web" });
    assert.deepEqual(ok.errors, {});
    const bad = validateAccountInput({ name: "A", type: "Nope", industry: "AerospaceDefense" });
    assert.match(bad.errors.type, /not a valid Type value/);
    assert.match(bad.errors.industry, /inactive Industry value/);
  });

  it("parses whole numbers for Annual Revenue and Employees", () => {
    const ok = validateAccountInput({ name: "A", annualRevenue: "1,250,000", numberOfEmployees: 42 });
    assert.equal(ok.data.annualRevenue, "1250000");
    assert.equal(ok.data.numberOfEmployees, 42);
    const bad = validateAccountInput({ name: "A", annualRevenue: "12.5", numberOfEmployees: "-3" });
    assert.match(bad.errors.annualRevenue, /whole number/);
    assert.match(bad.errors.numberOfEmployees, /whole number/);
    const tooLong = validateAccountInput({ name: "A", numberOfEmployees: "123456789" });
    assert.match(tooLong.errors.numberOfEmployees, /cannot exceed 8 digits/);
  });

  it("preserves 18-digit revenue exactly and rejects unsafe numeric JSON", () => {
    const valid = validateAccountInput({ name: "A", annualRevenue: "9007199254740993" });
    assert.equal(valid.data.annualRevenue, "9007199254740993");
    assert.deepEqual(valid.errors, {});
    const unsafe = validateAccountInput(accountInputFromJson({ name: "A", annualRevenue: 9007199254740993 }));
    assert.match(unsafe.errors.annualRevenue, /exact decimal string/);
  });

  it("preserves an unchanged inactive historical picklist but rejects selecting it for new records", () => {
    const input = { name: "Historical", industry: "Advertising" };
    assert.match(validateAccountInput(input).errors.industry, /inactive/);
    assert.deepEqual(validateAccountInput(input, { historicalPicklists: { industry: "Advertising" } }).errors, {});
  });

  it("resolves country and state labels from codes and enforces the dependency", () => {
    const ok = validateAccountInput({ name: "A", billingCountryCode: "US", billingStateCode: "CA", shippingCountryCode: "FR" });
    assert.deepEqual(ok.errors, {});
    assert.equal(ok.data.billingCountry, "United States");
    assert.equal(ok.data.billingState, "California");
    assert.equal(ok.data.shippingCountry, "France");
    assert.equal(ok.data.shippingStateCode, null);

    const noCountry = validateAccountInput({ name: "A", billingStateCode: "CA" });
    assert.match(noCountry.errors.billingStateCode, /Select a country/);

    const wrongState = validateAccountInput({ name: "A", billingCountryCode: "CA", billingStateCode: "TX" });
    assert.match(wrongState.errors.billingStateCode, /not a state\/province of Canada/);

    const noStates = validateAccountInput({ name: "A", shippingCountryCode: "FR", shippingStateCode: "IDF" });
    assert.match(noStates.errors.shippingStateCode, /no state\/province values/);

    const unknownCountry = validateAccountInput({ name: "A", billingCountryCode: "ZZ" });
    assert.match(unknownCountry.errors.billingCountryCode, /Select a country/);
  });

  it("enforces the observed field lengths", () => {
    const { errors } = validateAccountInput({ name: "A", tier: "ABC", accountNumber: "x".repeat(41) });
    assert.equal(errors.tier, "Maximum length is 2 characters.");
    assert.equal(errors.accountNumber, "Maximum length is 40 characters.");
  });

  it("reads booleans from form data and JSON", () => {
    const form = new FormData();
    form.set("name", "Form Co");
    form.set("isBuyer", "true");
    const fromForm = validateAccountInput(accountInputFromFormData(form));
    assert.equal(fromForm.data.isBuyer, true);
    assert.equal(fromForm.data.isCustomerPortal, false);

    const fromJson = validateAccountInput(accountInputFromJson({ name: "Json Co", isCustomerPortal: true, numberOfEmployees: 7 }));
    assert.equal(fromJson.data.isCustomerPortal, true);
    assert.equal(fromJson.data.numberOfEmployees, 7);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONVERT_ACTION_MESSAGE,
  CONVERT_ONLY_KEYS,
  LEAD_PATCH_STATUSES,
  REQUIRED_MESSAGE,
  UNQUALIFIED_MESSAGE,
  convertWriteErrors,
  qualifiedFieldError,
  statusFieldError,
  validateLeadInput,
} from "../../src/lib/leads/validation";

const base = { lastName: "Voss", company: "Paper Lantern" };

describe("lead status transitions", () => {
  it("allows every transition among New, Working and Unqualified", () => {
    for (const status of LEAD_PATCH_STATUSES) {
      assert.equal(statusFieldError(status), undefined);
      const result = validateLeadInput({ ...base, status, qualified: false });
      assert.deepEqual(result.errors, {});
      assert.equal(result.data.status, status);
    }
  });

  it("rejects Converted and any other status with the convert or picklist message", () => {
    assert.equal(statusFieldError("Converted"), CONVERT_ACTION_MESSAGE);
    assert.equal(validateLeadInput({ ...base, status: "Converted" }).errors.status, CONVERT_ACTION_MESSAGE);
    assert.equal(statusFieldError("Closed"), `"Closed" is not a valid Lead Status value.`);
    assert.equal(validateLeadInput({ ...base, status: "Closed" }).errors.status, `"Closed" is not a valid Lead Status value.`);
  });

  it("rejects convertedAt and converted ids on a write", () => {
    for (const key of CONVERT_ONLY_KEYS) {
      assert.deepEqual(convertWriteErrors({ [key]: key === "convertedAt" ? "2026-10-14T18:00:00.000Z" : "id" }), {
        status: CONVERT_ACTION_MESSAGE,
      });
    }
    assert.deepEqual(convertWriteErrors({ status: "Converted" }), { status: CONVERT_ACTION_MESSAGE });
    assert.deepEqual(convertWriteErrors({ status: " Working " }), {});
  });

  it("defaults status to New and qualified to false", () => {
    const { data, errors } = validateLeadInput(base);
    assert.deepEqual(errors, {});
    assert.equal(data.status, "New");
    assert.equal(data.qualified, false);
  });
});

describe("unqualified leads cannot be qualified", () => {
  it("rejects qualified true only when the resulting status is Unqualified", () => {
    assert.equal(qualifiedFieldError("Unqualified", true), UNQUALIFIED_MESSAGE);
    assert.equal(qualifiedFieldError("Unqualified", false), undefined);
    assert.equal(qualifiedFieldError("Working", true), undefined);
    assert.equal(qualifiedFieldError("New", true), undefined);

    const blocked = validateLeadInput({ ...base, status: "Unqualified", qualified: true });
    assert.equal(blocked.errors.qualified, UNQUALIFIED_MESSAGE);
    assert.equal(blocked.errors.status, undefined);

    for (const status of ["New", "Working"] as const) {
      const allowed = validateLeadInput({ ...base, status, qualified: true });
      assert.deepEqual(allowed.errors, {});
      assert.equal(allowed.data.qualified, true);
      assert.equal(allowed.data.status, status);
    }
  });

  it("requires last name and company with the shared message", () => {
    const { errors } = validateLeadInput({ lastName: "  ", company: "" });
    assert.equal(errors.lastName, REQUIRED_MESSAGE);
    assert.equal(errors.company, REQUIRED_MESSAGE);
  });

  it("enforces the designed field lengths", () => {
    const { errors } = validateLeadInput({ ...base, firstName: "a".repeat(81), company: "c".repeat(256), phone: "1".repeat(41) });
    assert.equal(errors.firstName, "Maximum length is 80 characters.");
    assert.equal(errors.company, "Maximum length is 255 characters.");
    assert.equal(errors.phone, "Maximum length is 40 characters.");
  });
});

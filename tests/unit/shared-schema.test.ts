import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEditAccount, canEditRecord } from "../../src/lib/auth/policies";
import { ConflictError } from "../../src/lib/errors";
import { errorResponse } from "../../src/lib/http";

const admin = {
  id: "admin",
  alias: "demoadm",
  firstName: "Demo",
  lastName: "Admin",
  role: "ADMIN" as const,
  pinnedAccountViewId: null,
};
const standard = {
  id: "std",
  alias: "demostd",
  firstName: "Demo",
  lastName: "Standard",
  role: "STANDARD" as const,
  pinnedAccountViewId: null,
};

describe("canEditRecord", () => {
  it("allows the owner or an administrator and keeps the account rule", () => {
    const record = { ownerId: standard.id };
    assert.equal(canEditRecord(standard, record), true);
    assert.equal(canEditRecord(admin, record), true);
    assert.equal(canEditRecord({ ...standard, id: "other" }, record), false);
    assert.equal(canEditAccount(admin, record), true);
    assert.equal(canEditAccount({ ...standard, id: "other" }, record), false);
  });
});

describe("ConflictError", () => {
  it("maps to HTTP 409 and includes conversion only when present", async () => {
    const bare = errorResponse(new ConflictError());
    assert.equal(bare.status, 409);
    assert.deepEqual(await bare.json(), { error: "This lead is already converted." });

    const conversion = {
      accountId: "acc",
      contactId: "con",
      opportunityId: null,
      convertedAt: "2026-10-14T18:00:00.000Z",
    };
    const detailed = errorResponse(new ConflictError("This lead is already converted.", conversion));
    assert.equal(detailed.status, 409);
    assert.deepEqual(await detailed.json(), { error: "This lead is already converted.", conversion });
  });
});

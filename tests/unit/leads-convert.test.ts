import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../src/lib/accounts/validation";
import { AMOUNT_MESSAGE, CLOSE_DATE_MESSAGE } from "../../src/lib/opportunities/validation";
import { convertInputFromFormData, opportunityStageError, readConvertInput } from "../../src/lib/leads/convert";
import { REQUIRED_MESSAGE } from "../../src/lib/leads/validation";

const company = "Analytical Engines";

describe("convert request", () => {
  it("defaults createOpportunity to false and accountName to the lead company", () => {
    const planned = readConvertInput({}, company);
    assert.equal(planned.createOpportunity, false);
    assert.equal(planned.accountName, company);
    assert.equal(planned.opportunity, null);
  });

  it("rejects an account name that is empty after trim", () => {
    assert.throws(
      () => readConvertInput({ accountName: "   " }, company),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.fieldErrors.accountName, REQUIRED_MESSAGE);
        return true;
      },
    );
  });

  it("uses an explicit account name and ignores opportunity fields when no opportunity is requested", () => {
    const planned = readConvertInput({ createOpportunity: false, accountName: "  Lantern Works  ", opportunity: { stage: "ClosedWon", closeDate: "" } }, company);
    assert.equal(planned.createOpportunity, false);
    assert.equal(planned.accountName, "Lantern Works");
    assert.equal(planned.opportunity, null);
  });

  it("requires a close date and rejects a JSON number amount", () => {
    assert.throws(
      () => readConvertInput({ createOpportunity: true, opportunity: { amount: 1200.5 } }, company),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.fieldErrors["opportunity.amount"], AMOUNT_MESSAGE);
        assert.equal(error.fieldErrors["opportunity.closeDate"], REQUIRED_MESSAGE);
        return true;
      },
    );
  });

  it("keeps an exact decimal string and defaults the opportunity name and stage", () => {
    const planned = readConvertInput(
      { createOpportunity: true, opportunity: { amount: "9007199254740993.01", closeDate: "2026-12-31" } },
      company,
    );
    assert.equal(planned.opportunity?.amount, "9007199254740993.01");
    assert.equal(planned.opportunity?.name, "Analytical Engines — Opportunity");
    assert.equal(planned.opportunity?.stage, "Qualification");
    assert.equal(planned.opportunity?.closeDate, "2026-12-31");
    assert.notEqual(String(Number("9007199254740993.01")), "9007199254740993.01");
  });

  it("rejects a close date that is not a real calendar day", () => {
    assert.throws(
      () => readConvertInput({ createOpportunity: true, opportunity: { closeDate: "2026-02-31" } }, company),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.fieldErrors["opportunity.closeDate"], CLOSE_DATE_MESSAGE);
        return true;
      },
    );
  });

  it("rejects ClosedWon, ClosedLost, and an unknown stage", () => {
    assert.match(opportunityStageError("ClosedWon") ?? "", /ClosedWon/);
    assert.match(opportunityStageError("ClosedLost") ?? "", /ClosedLost/);
    assert.equal(opportunityStageError("Mystery"), `"Mystery" is not a valid Stage value.`);
    assert.equal(opportunityStageError("Qualification"), undefined);
    assert.equal(opportunityStageError("Proposal"), undefined);
    assert.equal(opportunityStageError("Negotiation"), undefined);
  });

  it("reads the convert form as booleans and strings", () => {
    const withOpportunity = new FormData();
    withOpportunity.set("accountName", "Lantern Works");
    withOpportunity.set("createOpportunity", "true");
    withOpportunity.set("opportunityName", "Lantern Works — first deal");
    withOpportunity.set("amount", "1200.50");
    withOpportunity.set("closeDate", "2026-12-31");
    withOpportunity.set("stage", "Proposal");
    const planned = readConvertInput(convertInputFromFormData(withOpportunity), company);
    assert.equal(planned.createOpportunity, true);
    assert.equal(planned.accountName, "Lantern Works");
    assert.equal(planned.opportunity?.name, "Lantern Works — first deal");
    assert.equal(planned.opportunity?.amount, "1200.50");
    assert.equal(planned.opportunity?.stage, "Proposal");

    const without = new FormData();
    without.set("accountName", company);
    const skipped = readConvertInput(convertInputFromFormData(without), company);
    assert.equal(skipped.createOpportunity, false);
    assert.equal(skipped.opportunity, null);
  });
});

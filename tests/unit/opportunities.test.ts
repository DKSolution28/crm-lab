import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { normalizeKanbanAmount } from "../../src/lib/opportunities/format";
import {
  AMOUNT_MESSAGE,
  REQUIRED_MESSAGE,
  ValidationError,
  applyStageTransition,
  opportunityInputFromJson,
  parseAmount,
  validateOpportunityInput,
  OPPORTUNITY_STAGES,
} from "../../src/lib/opportunities/validation";

const EXACT = "9007199254740993.01";

const base = {
  name: "Northwind — Renewal FY27",
  stageName: "Qualification",
  closeDate: "2026-12-31",
  accountId: "acct",
};

describe("opportunity amount parsing", () => {
  it("keeps 9007199254740993.01 as a decimal string", () => {
    const parsed = parseAmount(EXACT);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.amount, EXACT);
    assert.equal(new Prisma.Decimal(parsed.amount).toString(), EXACT);
    assert.notEqual(String(Number(EXACT)), EXACT);

    const validated = validateOpportunityInput({ ...base, amount: EXACT });
    assert.deepEqual(validated.errors, {});
    assert.equal(validated.data.amount, EXACT);
    assert.equal(typeof validated.data.amount, "string");
  });

  it("rejects a JSON number before it can be rounded", () => {
    const raw = 9007199254740993.01;
    assert.equal(typeof raw, "number");
    const input = opportunityInputFromJson({ ...base, amount: raw });
    assert.equal(typeof input.amount, "number");
    const parsed = parseAmount(input.amount);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.message, AMOUNT_MESSAGE);
    const validated = validateOpportunityInput(input);
    assert.equal(validated.errors.amount, AMOUNT_MESSAGE);
    assert.equal(validated.data.amount, null);
  });

  it("rejects exponents, extra decimals, and more than 16 integer digits", () => {
    for (const value of ["1e2", "1.234", "90071992547409931.01", "1.", ".5", "+10", "10,00"]) {
      const parsed = parseAmount(value);
      assert.equal(parsed.ok, false, value);
    }
    assert.equal(parseAmount(12).ok, false);
    const empty = parseAmount(null);
    assert.equal(empty.ok && empty.amount, null);
    const padded = parseAmount(" 10.50 ");
    assert.equal(padded.ok && padded.amount, "10.50");
  });

  it("normalizes kanban sums from SQL text and refuses a numeric driver value", () => {
    assert.equal(normalizeKanbanAmount(EXACT), EXACT);
    assert.equal(normalizeKanbanAmount("0"), "0.00");
    assert.equal(normalizeKanbanAmount("240000"), "240000.00");
    assert.throws(() => normalizeKanbanAmount(Number(EXACT)), /returned as text/);
    assert.throws(() => normalizeKanbanAmount(0), /returned as text/);
  });
});

describe("opportunity stage transition", () => {
  it("allows every stage to move to every stage", () => {
    for (const from of OPPORTUNITY_STAGES) {
      for (const to of OPPORTUNITY_STAGES) {
        assert.equal(applyStageTransition(from, to), to);
      }
    }
    assert.equal(applyStageTransition(null, "ClosedWon"), "ClosedWon");
  });

  it("rejects an unknown stage and a missing stage", () => {
    assert.throws(() => applyStageTransition("Qualification", "Closed"), ValidationError);
    assert.throws(() => applyStageTransition("Nope", "Proposal"), ValidationError);
    const missing = validateOpportunityInput({ ...base, stageName: "   " });
    assert.equal(missing.errors.stageName, REQUIRED_MESSAGE);
    const created = validateOpportunityInput({ ...base, stageName: "ClosedLost" });
    assert.equal(created.errors.stageName, undefined);
    assert.equal(created.data.stageName, "ClosedLost");
    const updated = validateOpportunityInput({ ...base, stageName: "Qualification" }, { fromStage: "ClosedLost" });
    assert.deepEqual(updated.errors, {});
    assert.equal(updated.data.stageName, "Qualification");
  });

  it("requires the account, a calendar close date, and a probability from 0 to 100", () => {
    const missing = validateOpportunityInput({ name: "A", stageName: "Proposal" });
    assert.equal(missing.errors.accountId, REQUIRED_MESSAGE);
    assert.equal(missing.errors.closeDate, REQUIRED_MESSAGE);
    const badDate = validateOpportunityInput({ ...base, closeDate: "2026-02-31" });
    assert.match(badDate.errors.closeDate, /YYYY-MM-DD/);
    const ok = validateOpportunityInput({ ...base, probability: 0, amount: null });
    assert.equal(ok.data.probability, 0);
    assert.equal(ok.data.closeDate.toISOString(), "2026-12-31T00:00:00.000Z");
    assert.equal(validateOpportunityInput({ ...base, probability: 100 }).data.probability, 100);
    assert.match(validateOpportunityInput({ ...base, probability: 101 }).errors.probability, /0 to 100/);
    assert.match(validateOpportunityInput({ ...base, probability: 60.5 }).errors.probability, /0 to 100/);
    assert.match(validateOpportunityInput({ ...base, name: "x".repeat(121) }).errors.name, /120/);
  });
});

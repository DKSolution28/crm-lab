import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import {
  DASHBOARD_STAGES,
  normalizeDashboardAmount,
  readCount,
  toDashboardSnapshot,
  type DashboardAggregates,
} from "../../src/lib/dashboard/service";

const EXACT = "9007199254740993.01";

const aggregates = (overrides: Partial<DashboardAggregates> = {}): DashboardAggregates => ({
  accounts: 0,
  contacts: 0,
  leads: 0,
  stages: DASHBOARD_STAGES.map((stage) => ({ stage, count: 0, amount: "0" })),
  pipelineAmount: "0",
  overdueTasks: 0,
  ...overrides,
});

describe("dashboard amounts", () => {
  it("keeps 9007199254740993.01 as a two-decimal string", () => {
    assert.equal(normalizeDashboardAmount(EXACT), EXACT);
    assert.equal(normalizeDashboardAmount("0"), "0.00");
    assert.equal(normalizeDashboardAmount(" 250.5 "), "250.50");
    assert.equal(typeof normalizeDashboardAmount(EXACT), "string");
    assert.notEqual(normalizeDashboardAmount(EXACT), new Prisma.Decimal(Number(EXACT)).toFixed(2));
    assert.notEqual(String(Number(EXACT)), EXACT);
  });

  it("refuses a numeric driver value", () => {
    assert.throws(() => normalizeDashboardAmount(Number(EXACT)), /returned as text/);
    assert.throws(() => normalizeDashboardAmount(0), /returned as text/);
    assert.throws(() => normalizeDashboardAmount(null), /returned as text/);
  });
});

describe("dashboard counts", () => {
  it("reads only safe integers", () => {
    assert.equal(readCount(0), 0);
    assert.equal(readCount(4), 4);
    assert.equal(readCount(4n), 4);
    assert.equal(readCount("12"), 12);
    assert.throws(() => readCount(1.5), /integer/);
    assert.throws(() => readCount("1.5"), /integer/);
    assert.throws(() => readCount(EXACT), /integer/);
    assert.throws(() => readCount(null), /integer/);
  });
});

describe("dashboard snapshot", () => {
  it("places SQL text into the response without adding closed amounts", () => {
    const stages = DASHBOARD_STAGES.map((stage) => {
      if (stage === "Proposal") return { stage, count: 1, amount: EXACT };
      if (stage === "ClosedWon") return { stage, count: 2, amount: "250.50" };
      return { stage, count: 0, amount: "0" };
    });
    const snapshot = toDashboardSnapshot(
      aggregates({
        accounts: 3,
        contacts: "2",
        leads: 1n,
        stages,
        pipelineAmount: EXACT,
        overdueTasks: 1,
      }),
    );
    assert.deepEqual(
      snapshot.opportunitiesByStage.map((row) => row.stage),
      [...DASHBOARD_STAGES],
    );
    assert.equal(snapshot.opportunitiesByStage[1]?.amount, EXACT);
    assert.equal(snapshot.opportunitiesByStage[1]?.count, 1);
    assert.equal(snapshot.opportunitiesByStage[3]?.stage, "ClosedWon");
    assert.equal(snapshot.opportunitiesByStage[3]?.amount, "250.50");
    assert.equal(snapshot.pipelineAmount, EXACT);
    assert.equal(snapshot.pipelineAmount, snapshot.opportunitiesByStage.find((row) => row.stage === "Proposal")?.amount);
    assert.notEqual(snapshot.pipelineAmount, "9007199254741243.51");
    assert.equal(snapshot.accounts, 3);
    assert.equal(snapshot.contacts, 2);
    assert.equal(snapshot.leads, 1);
    assert.equal(snapshot.overdueTasks, 1);
    for (const stage of ["Qualification", "Negotiation", "ClosedLost"] as const) {
      const row = snapshot.opportunitiesByStage.find((item) => item.stage === stage);
      assert.equal(row?.count, 0);
      assert.equal(row?.amount, "0.00");
    }
  });

  it("does not invent a zero for a stage SQL omitted", () => {
    const stages = aggregates().stages.slice(0, 4);
    assert.throws(() => toDashboardSnapshot(aggregates({ stages })), /every stage/);
    const swapped = aggregates().stages.map((row) => ({ ...row }));
    const first = swapped[0];
    swapped[0] = swapped[1];
    swapped[1] = first;
    assert.throws(() => toDashboardSnapshot(aggregates({ stages: swapped })), /expected Qualification/);
  });
});

// Agrégats du tableau de bord. Les comptes et les sommes viennent de SQL.
// Le service ne parcourt pas les lignes et n'additionne pas les montants.
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const DASHBOARD_STAGES = ["Qualification", "Proposal", "Negotiation", "ClosedWon", "ClosedLost"] as const;

export type DashboardStage = (typeof DASHBOARD_STAGES)[number];

export type DashboardStageTotal = {
  stage: DashboardStage;
  count: number;
  amount: string;
};

export type DashboardSnapshot = {
  accounts: number;
  contacts: number;
  leads: number;
  opportunitiesByStage: DashboardStageTotal[];
  pipelineAmount: string;
  overdueTasks: number;
};

type StageAggregate = {
  stage: string;
  count: unknown;
  amount: unknown;
};

export type DashboardAggregates = {
  accounts: unknown;
  contacts: unknown;
  leads: unknown;
  stages: StageAggregate[];
  pipelineAmount: unknown;
  overdueTasks: unknown;
};

const isDashboardStage = (value: string): value is DashboardStage =>
  (DASHBOARD_STAGES as readonly string[]).includes(value);

/** Compte entier renvoyé par `COUNT(*)::int`. `Number` n'est utilisé que ici. */
export const readCount = (value: unknown): number => {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "bigint" || (typeof value === "string" && /^-?\d+$/.test(value))) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw new Error("Dashboard count must be an integer");
};

/** Normalise le texte de `COALESCE(SUM("amount"), 0)::text`. */
export const normalizeDashboardAmount = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("Dashboard amount must be returned as text");
  }
  return new Prisma.Decimal(value.trim()).toFixed(2);
};

const requireRow = <T>(rows: T[], label: string): T => {
  if (rows.length !== 1) {
    throw new Error(`${label} query must return one row`);
  }
  return rows[0];
};

/**
 * Place les agrégats SQL dans la réponse. Aucune somme : `pipelineAmount`
 * est déjà le total des étapes ouvertes, distinct des colonnes fermées.
 */
export const toDashboardSnapshot = (aggregates: DashboardAggregates): DashboardSnapshot => {
  if (aggregates.stages.length !== DASHBOARD_STAGES.length) {
    throw new Error("Dashboard stage aggregate must return every stage");
  }
  const byStage = new Map<string, StageAggregate>();
  for (const row of aggregates.stages) {
    if (!isDashboardStage(row.stage) || byStage.has(row.stage)) {
      throw new Error(`Dashboard stage aggregate returned ${row.stage}`);
    }
    byStage.set(row.stage, row);
  }
  // L'ordre d'unnest n'est pas garanti. On replace les lignes SQL ; on n'en invente pas.
  const opportunitiesByStage = DASHBOARD_STAGES.map((stage) => {
    const row = byStage.get(stage);
    if (!row) throw new Error(`Dashboard stage aggregate omitted ${stage}`);
    return {
      stage,
      count: readCount(row.count),
      amount: normalizeDashboardAmount(row.amount),
    };
  });
  return {
    accounts: readCount(aggregates.accounts),
    contacts: readCount(aggregates.contacts),
    leads: readCount(aggregates.leads),
    opportunitiesByStage,
    pipelineAmount: normalizeDashboardAmount(aggregates.pipelineAmount),
    overdueTasks: readCount(aggregates.overdueTasks),
  };
};

export const getDashboard = async (): Promise<DashboardSnapshot> => {
  const [accounts, contacts, leads, stages, pipeline, overdueTasks] = await Promise.all([
    prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Account"`,
    prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Contact"`,
    prisma.$queryRaw<Array<{ count: unknown }>>`SELECT COUNT(*)::int AS count FROM "Lead"`,
    prisma.$queryRaw<StageAggregate[]>`
      SELECT s.stage::text AS stage,
             COALESCE(agg.count, 0)::int AS count,
             COALESCE(agg.amount, 0)::text AS amount
      FROM unnest(ARRAY['Qualification','Proposal','Negotiation','ClosedWon','ClosedLost']::"OpportunityStage"[]) AS s(stage)
      LEFT JOIN (
        SELECT "stageName" AS stage, COUNT(*) AS count, SUM("amount") AS amount
        FROM "Opportunity"
        GROUP BY "stageName"
      ) agg ON agg.stage = s.stage
    `,
    prisma.$queryRaw<Array<{ amount: unknown }>>`
      SELECT COALESCE(SUM("amount"), 0)::text AS amount
      FROM "Opportunity"
      WHERE "stageName" IN ('Qualification', 'Proposal', 'Negotiation')
    `,
    prisma.$queryRaw<Array<{ count: unknown }>>`
      SELECT COUNT(*)::int AS count
      FROM "Task"
      WHERE "dueDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
        AND "status" <> 'Completed'
    `,
  ]);

  return toDashboardSnapshot({
    accounts: requireRow(accounts, "Account count").count,
    contacts: requireRow(contacts, "Contact count").count,
    leads: requireRow(leads, "Lead count").count,
    stages,
    pipelineAmount: requireRow(pipeline, "Pipeline amount").amount,
    overdueTasks: requireRow(overdueTasks, "Overdue task count").count,
  });
};

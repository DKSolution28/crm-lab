// Affichage des montants d'opportunité. La chaîne décimale est conservée :
// pas de Number, pas de Intl.NumberFormat.
import { Prisma } from "@prisma/client";

export const formatOpportunityAmount = (amount: string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") return "";
  return amount;
};

/** Normalise le texte renvoyé par `COALESCE(SUM("amount"), 0)::text`. */
export const normalizeKanbanAmount = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("Kanban amount must be returned as text");
  }
  return new Prisma.Decimal(value.trim()).toFixed(2);
};

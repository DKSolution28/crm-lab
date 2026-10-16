import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/accounts/format";
import type { KanbanColumn } from "@/lib/accounts/service";

// Kanban (conçu à partir de LST-5) : colonnes par valeur du champ de regroupement,
// cartes avec nom, propriétaire et ville de facturation. Pas de glisser-déposer
// (non observé).
export function KanbanBoard({ columns, groupLabel, summaryKey, summaryLabel }: { columns: KanbanColumn[]; groupLabel: string; summaryKey: string | null; summaryLabel: string | null }) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4" aria-label={`Kanban grouped by ${groupLabel}`}>
      {columns.map((column) => (
        <section key={column.key || "none"} aria-label={column.label} className="flex w-72 shrink-0 flex-col rounded-md border border-slate-200 bg-slate-50">
          <header className="border-b border-slate-200 px-3 py-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{column.label}</h3>
            <p className="text-xs text-slate-500">
              {column.items.length} item{column.items.length > 1 ? "s" : ""}
              {summaryKey && column.summary !== null ? ` • ${summaryLabel}: ${summaryKey === "annualRevenue" ? formatCurrency(column.summary) : formatNumber(column.summary)}` : ""}
            </p>
          </header>
          <ul className="flex flex-col gap-2 p-2">
            {column.items.map((account) => (
              <li key={account.id} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
                <Link href={`/accounts/${account.id}`} className="block truncate text-sm font-medium text-blue-700 hover:underline">
                  {account.name}
                </Link>
                <p className="mt-1 truncate text-xs text-slate-600">{[account.billingCity, account.billingCountry].filter(Boolean).join(", ") || "—"}</p>
                <p className="mt-1 text-xs text-slate-500">Owner: {account.owner.alias}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import Link from "next/link";
import type { KanbanColumnDto } from "@/lib/opportunities/service";

// Colonnes fixes par étape, y compris ClosedWon et ClosedLost.
// Le montant affiché est le SUM SQL du filtre, pas la somme des cartes.
export function OpportunityKanban({ columns }: { columns: KanbanColumnDto[] }) {
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4" aria-label="Kanban grouped by Stage">
      {columns.map((column) => (
        <section key={column.stage} aria-label={column.label} className="flex w-72 shrink-0 flex-col rounded-md border border-slate-200 bg-slate-50">
          <header className="border-b border-slate-200 px-3 py-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{column.label}</h3>
            <p className="text-xs text-slate-500">
              {column.count} item{column.count === 1 ? "" : "s"} • <span data-testid={`kanban-total-${column.stage}`}>{column.amount}</span>
            </p>
          </header>
          {column.count > column.items.length ? <p className="px-3 pt-2 text-xs text-slate-500">Totals include opportunities beyond this page.</p> : null}
          <ul className="flex flex-col gap-2 p-2">
            {column.items.map((opportunity) => (
              <li key={opportunity.id} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
                <Link href={`/opportunities/${opportunity.id}`} className="block truncate text-sm font-medium text-blue-700 hover:underline">
                  {opportunity.name}
                </Link>
                <p className="mt-1 truncate text-xs text-slate-600">{opportunity.account?.name ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-700">{opportunity.amount ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-500">{opportunity.closeDate}</p>
                <p className="mt-1 text-xs text-slate-500">Owner: {opportunity.owner.alias}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

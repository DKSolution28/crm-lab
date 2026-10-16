import type { DashboardSnapshot } from "@/lib/dashboard/service";

const countLabel = (count: number) => `${count} item${count === 1 ? "" : "s"}`;

// Affiche les chaînes et les comptes déjà calculés. Pas de somme côté client.
export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  const counts = [
    { key: "accounts", label: "Accounts", value: snapshot.accounts },
    { key: "contacts", label: "Contacts", value: snapshot.contacts },
    { key: "leads", label: "Leads", value: snapshot.leads },
  ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-[#032d60] text-lg text-white">
            ▣
          </span>
          <div>
            <p className="text-xs text-slate-500">Dashboard</p>
            <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <section aria-label="Record counts" className="grid gap-3 sm:grid-cols-3">
          {counts.map((item) => (
            <article key={item.key} className="rounded-md border border-slate-200 bg-white px-4 py-3">
              <h2 className="text-xs font-medium text-slate-500">{item.label}</h2>
              <p data-testid={`dashboard-${item.key}`} className="mt-1 text-2xl font-semibold text-slate-900">
                {item.value}
              </p>
            </article>
          ))}
        </section>
        <section aria-label="Pipeline" className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <h2 className="text-xs font-medium text-slate-500">Pipeline</h2>
            <p className="mt-1 text-xs text-slate-500">Qualification, Proposal, and Negotiation</p>
            <p data-testid="dashboard-pipeline-amount" className="mt-2 overflow-x-auto font-mono text-lg text-slate-900">
              {snapshot.pipelineAmount}
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <h2 className="text-xs font-medium text-slate-500">Overdue tasks</h2>
            <p className="mt-1 text-xs text-slate-500">Due before today (UTC) and not Completed</p>
            <p data-testid="dashboard-overdue-tasks" className="mt-2 text-2xl font-semibold text-slate-900">
              {snapshot.overdueTasks}
            </p>
          </article>
        </section>
        <section aria-label="Opportunities by stage" className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">
              Opportunities by stage
            </caption>
            <thead className="text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Stage
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Count
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.opportunitiesByStage.map((row) => (
                <tr key={row.stage} data-testid={`dashboard-stage-${row.stage}`} className="border-t border-slate-100">
                  <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                    {row.stage}
                  </th>
                  <td className="px-4 py-3 text-slate-700">
                    <span data-testid={`dashboard-stage-count-${row.stage}`}>{row.count}</span>
                    <span className="sr-only"> {countLabel(row.count)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900">
                    <span data-testid={`dashboard-stage-amount-${row.stage}`}>{row.amount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

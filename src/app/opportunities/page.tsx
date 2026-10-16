import Link from "next/link";
import type { Metadata } from "next";
import { ListSearch } from "@/components/accounts/list-search";
import { RefreshButton } from "@/components/accounts/refresh-button";
import { OpportunityDisplaySwitcher } from "@/components/opportunities/display-switcher";
import { OpportunityKanban } from "@/components/opportunities/kanban-board";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";
import { ScopeSwitcher } from "@/components/opportunities/scope-switcher";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { FilterError, parseFiltersQuery } from "@/lib/opportunities/filters";
import { listOpportunities } from "@/lib/opportunities/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opportunities | CRM Lab" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const sortLabel = (field: string) =>
  field === "name" ? "Opportunity Name" : field === "stageName" ? "Stage" : field === "amount" ? "Amount" : field === "probability" ? "Probability" : field === "createdAt" ? "Created Date" : "Close Date";

export default async function OpportunitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const display = single(params.display) === "kanban" ? "kanban" : "table";
  const q = single(params.q);
  const toast = parseToast(params.toast);
  const page = Math.max(1, Number(single(params.page)) || 1);

  let filters: unknown = [];
  try {
    filters = parseFiltersQuery(single(params.filters) || null);
  } catch (error) {
    if (error instanceof FilterError) return <FilterProblem message={error.message} />;
    throw error;
  }

  let result;
  try {
    result = await listOpportunities(user, {
      q,
      sortField: single(params.sort) || null,
      sortDirection: single(params.dir) || null,
      page,
      pageSize: display === "kanban" ? 200 : 50,
      scope: single(params.scope) || null,
      filters,
      filterLogic: single(params.filterLogic) || null,
      display,
    });
  } catch (error) {
    if (error instanceof FilterError) return <FilterProblem message={error.message} />;
    throw error;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const scopeLabel = result.scope === "mine" ? "My opportunities" : result.scope === "recent" ? "Recently viewed" : "All opportunities";
  const query = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, single(value)]));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="border-b border-slate-200 bg-white px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-[#e07a3d] text-lg text-white">
              ◔
            </span>
            <div>
              <p className="text-xs text-slate-500">Opportunities</p>
              <h1 className="text-lg font-semibold text-slate-900">Opportunities</h1>
            </div>
          </div>
          <Link href="/opportunities/new" className={buttonClasses.neutral}>
            New
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600" role="status">
            {result.total} item{result.total === 1 ? "" : "s"} • Sorted by {sortLabel(result.sortField)} • Filtered by {scopeLabel}
            {q ? ` • Search: “${q}”` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <ScopeSwitcher scope={result.scope} />
            <ListSearch initial={q} />
            <OpportunityDisplaySwitcher display={display} />
            <RefreshButton />
          </div>
        </div>
      </header>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        {display === "kanban" && result.columns ? (
          <OpportunityKanban columns={result.columns} />
        ) : result.total === 0 ? (
          <EmptyState filtered={Boolean(q) || result.scope !== "all"} />
        ) : (
          <OpportunitiesTable items={result.items} sortField={result.sortField} sortDirection={result.sortDirection} pageOffset={(result.page - 1) * result.pageSize} />
        )}
        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
            <span>
              Page {result.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link href={{ pathname: "/opportunities", query: { ...query, page: String(result.page - 1) } }} className="text-blue-700 hover:underline">
                  Previous
                </Link>
              ) : null}
              {result.page < totalPages ? (
                <Link href={{ pathname: "/opportunities", query: { ...query, page: String(result.page + 1) } }} className="text-blue-700 hover:underline">
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </main>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div aria-hidden className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-4xl text-orange-600">
        ◔
      </div>
      <h2 className="text-xl font-semibold text-slate-800">{filtered ? "No items to display." : "Track deals from qualification to close"}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">{filtered ? "Clear the search or switch back to all opportunities." : "Add an opportunity to see it on the pipeline."}</p>
      {!filtered ? (
        <Link href="/opportunities/new" className={`${buttonClasses.brand} mt-4`}>
          New Opportunity
        </Link>
      ) : null}
    </div>
  );
}

function FilterProblem({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p role="alert" className="text-sm text-red-800">
        {message}
      </p>
      <Link href="/opportunities" className={buttonClasses.neutral}>
        Back to Opportunities
      </Link>
    </div>
  );
}

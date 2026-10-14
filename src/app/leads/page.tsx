import Link from "next/link";
import type { Metadata } from "next";
import { ListSearch } from "@/components/accounts/list-search";
import { RefreshButton } from "@/components/accounts/refresh-button";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable, type LeadRow } from "@/components/leads/leads-table";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { FilterError, readLeadListQuery, type LeadListQuery } from "@/lib/leads/filters";
import { leadDisplayName } from "@/lib/leads/format";
import { getLeadField } from "@/lib/leads/fields";
import { listLeads } from "@/lib/leads/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads | CRM Lab" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const SCOPE_LABEL = { all: "All leads", mine: "My leads", recent: "Recently viewed" } as const;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const toast = parseToast(params.toast);
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = single(value);
    if (text) url.set(key, text);
  }

  let query: LeadListQuery;
  try {
    query = readLeadListQuery(url);
  } catch (error) {
    if (error instanceof FilterError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-800">The lead list filters are not valid.</h1>
          <p role="alert" className="max-w-md text-sm text-red-700">
            {error.message}
          </p>
          <Link href="/leads" className={buttonClasses.neutral}>
            Clear and return to leads
          </Link>
        </div>
      );
    }
    throw error;
  }

  const result = await listLeads(user, query);
  const sortable = result.scope !== "recent";
  const sortLabel = getLeadField(result.sortField)?.label ?? "Last Name";
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const statusFilter = query.filters.find((filter) => filter.field === "status" && filter.operator === "equals" && typeof filter.value === "string");
  const qualifiedFilter = query.filters.find((filter) => filter.field === "qualified" && filter.operator === "equals" && typeof filter.value === "string");
  const rows: LeadRow[] = result.items.map((lead) => ({
    id: lead.id,
    name: leadDisplayName(lead),
    company: lead.company,
    status: lead.status,
    qualified: lead.qualified ? "Yes" : "No",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    owner: lead.owner.alias,
    converted: lead.conversion !== null,
  }));

  const preserved = Object.fromEntries([...url.entries()].filter(([key]) => key !== "page" && key !== "toast"));
  const scopeHref = (scope: "all" | "mine" | "recent") => {
    const next = { ...preserved };
    if (scope === "all") delete next.scope;
    else next.scope = scope;
    return { pathname: "/leads", query: next };
  };
  const pageHref = (page: number) => ({ pathname: "/leads", query: { ...preserved, page: String(page) } });
  const summary = `${result.total} item${result.total === 1 ? "" : "s"} • ${sortable ? `Sorted by ${sortLabel} • ` : ""}Filtered by ${SCOPE_LABEL[result.scope]}${query.filters.length ? ` + ${query.filters.length} filter${query.filters.length > 1 ? "s" : ""}` : ""}${query.q ? ` • Search: “${query.q}”` : ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="border-b border-slate-200 bg-white px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-[#7f8de1] text-lg text-white">
              +
            </span>
            <div>
              <p className="text-xs text-slate-500">Leads</p>
              <h1 className="text-lg font-semibold text-slate-900">Leads</h1>
            </div>
          </div>
          <Link href="/leads/new" className={buttonClasses.neutral}>
            New
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600" role="status">
            {summary}
          </p>
          <div className="flex items-center gap-1">
            <ListSearch initial={query.q ?? ""} />
            <RefreshButton />
          </div>
        </div>
        <nav aria-label="Lead scope" className="mt-2 flex gap-2 text-sm">
          {(["all", "mine", "recent"] as const).map((scope) => (
            <Link
              key={scope}
              href={scopeHref(scope)}
              aria-current={result.scope === scope ? "page" : undefined}
              className={`rounded px-2 py-1 ${result.scope === scope ? "bg-blue-50 font-medium text-blue-800" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {SCOPE_LABEL[scope]}
            </Link>
          ))}
        </nav>
      </header>
      <LeadFilters status={typeof statusFilter?.value === "string" ? statusFilter.value : ""} qualified={typeof qualifiedFilter?.value === "string" ? qualifiedFilter.value : ""} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        {result.total === 0 ? (
          <EmptyState q={query.q ?? ""} hasFilters={query.filters.length > 0} scope={result.scope} />
        ) : (
          <>
            <LeadsTable items={rows} sortField={result.sortField} sortDirection={result.sortDirection} sortable={sortable} />
            {totalPages > 1 ? (
              <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
                <span>
                  Page {result.page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {result.page > 1 ? (
                    <Link href={pageHref(result.page - 1)} className="text-blue-700 hover:underline">
                      Previous
                    </Link>
                  ) : null}
                  {result.page < totalPages ? (
                    <Link href={pageHref(result.page + 1)} className="text-blue-700 hover:underline">
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ q, hasFilters, scope }: { q: string; hasFilters: boolean; scope: string }) {
  const filtered = Boolean(q) || hasFilters || scope !== "all";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div aria-hidden className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-4xl text-indigo-500">
        +
      </div>
      <h2 className="text-xl font-semibold text-slate-800">{filtered ? "No items to display." : "No leads yet"}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">
        {filtered ? "Try another scope, clear the search, or remove filters." : "Keep track of prospective customers before they become accounts."}
      </p>
      {!filtered ? (
        <Link href="/leads/new" className={`${buttonClasses.brand} mt-4`}>
          Add a Lead
        </Link>
      ) : null}
    </div>
  );
}

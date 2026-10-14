import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AccountDetails } from "@/components/accounts/account-details";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { DisplaySwitcher } from "@/components/accounts/display-switcher";
import { FilterPanel } from "@/components/accounts/filter-panel";
import { KanbanBoard } from "@/components/accounts/kanban-board";
import { ListSearch } from "@/components/accounts/list-search";
import { ListViewControls } from "@/components/accounts/list-view-controls";
import { columnOptions, filterFieldOptions, kanbanGroupOptions, kanbanSummaryOptions, toViewDto } from "@/components/accounts/list-metadata";
import { RefreshButton } from "@/components/accounts/refresh-button";
import type { DisplayMode } from "@/components/accounts/types";
import { ViewSelector } from "@/components/accounts/view-selector";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getField } from "@/lib/accounts/fields";
import { formatFieldValue } from "@/lib/accounts/format";
import { findView, listVisibleViews, resolveDefaultView, viewFilters } from "@/lib/accounts/list-views";
import { getAccount, groupForKanban, isKanbanGroupField, isKanbanSummaryField, listAccounts } from "@/lib/accounts/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Accounts | CRM Lab" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function AccountsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const views = await listVisibleViews(user);
  const requestedView = single(params.view);
  const view = requestedView ? await findView(requestedView, user) : await resolveDefaultView(user);
  if (!view) notFound();

  const display: DisplayMode = single(params.display) === "kanban" ? "kanban" : single(params.display) === "split" ? "split" : "table";
  const q = single(params.q);
  const sortParam = single(params.sort) || null;
  const dirParam = single(params.dir) === "desc" ? "desc" : single(params.dir) === "asc" ? "asc" : null;
  const page = Math.max(1, Number(single(params.page)) || 1);
  const filtersOpen = single(params.filters) === "1";
  const groupBy = single(params.groupBy) || null;
  const summarizeBy = single(params.summarizeBy) || null;
  const selectedId = single(params.selected) || null;
  const toast = parseToast(params.toast);

  const result = await listAccounts(view, user, {
    q,
    sortField: sortParam,
    sortDirection: dirParam,
    page,
    pageSize: display === "kanban" ? 200 : 50,
  });

  const viewDto = toViewDto(view, user);
  const columns = view.columns.map((key) => getField(key)).filter((field) => !!field).map((field) => ({ key: field.key, label: field.label, sortable: field.sortable }));
  const cells = Object.fromEntries(result.items.map((account) => [account.id, Object.fromEntries(columns.map((column) => [column.key, formatFieldValue(account, column.key)]))]));
  const appliedFilters = viewFilters(view);
  const sortLabel = result.sortField ? getField(result.sortField)?.label : null;
  const scopeLabel = view.scope === "MINE" ? "My accounts" : view.scope === "NEW_THIS_WEEK" ? "New this week" : view.scope === "RECENT" ? "Recently viewed" : "All accounts";
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const selected = display === "split" ? (selectedId ? await getAccount(selectedId) : null) : null;
  const kanbanColumns = display === "kanban" && isKanbanGroupField(groupBy) ? groupForKanban(result.items, groupBy, isKanbanSummaryField(summarizeBy) ? summarizeBy : null) : null;

  const summary = `${result.total} item${result.total === 1 ? "" : "s"} • ${sortLabel ? `Sorted by ${sortLabel} • ` : ""}Filtered by ${scopeLabel}${appliedFilters.length ? ` + ${appliedFilters.length} filter${appliedFilters.length > 1 ? "s" : ""}` : ""}${q ? ` • Search: “${q}”` : ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="border-b border-slate-200 bg-white px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-[#7f8de1] text-lg text-white">
              ▦
            </span>
            <div>
              <p className="text-xs text-slate-500">Accounts</p>
              <ViewSelector views={views.map((v) => toViewDto(v, user))} current={viewDto} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/accounts/new" className={buttonClasses.neutral}>
              New
            </Link>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600" role="status">
            {summary}
          </p>
          <div className="flex items-center gap-1">
            <ListSearch initial={q} />
            <ListViewControls view={viewDto} columnOptions={columnOptions()} />
            <DisplaySwitcher display={display} groupBy={groupBy} summarizeBy={summarizeBy} groupOptions={kanbanGroupOptions()} summaryOptions={kanbanSummaryOptions()} />
            <RefreshButton />
            <Link
              href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), filters: filtersOpen ? undefined : "1" } }}
              aria-label="Filters"
              title="Filters"
              aria-pressed={filtersOpen}
              className={`${buttonClasses.icon} ${filtersOpen ? "border-blue-600 text-blue-700" : ""}`}
            >
              ⚯
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {result.total === 0 ? (
            <EmptyState q={q} hasFilters={appliedFilters.length > 0} scope={view.scope} />
          ) : display === "kanban" ? (
            kanbanColumns ? (
              <KanbanBoard columns={kanbanColumns} groupLabel={kanbanGroupOptions().find((o) => o.key === groupBy)?.label ?? ""} summaryKey={isKanbanSummaryField(summarizeBy) ? summarizeBy : null} summaryLabel={kanbanSummaryOptions().find((o) => o.key === summarizeBy)?.label ?? null} />
            ) : (
              <p className="p-6 text-sm text-slate-600">Choose a “Group By” field in Kanban Settings to display the board.</p>
            )
          ) : display === "split" ? (
            <div className="flex min-h-0 flex-1">
              <nav aria-label="Select an item from this list to open it." className="w-72 shrink-0 overflow-y-auto border-r border-slate-200">
                <ul>
                  {result.items.map((account) => (
                    <li key={account.id}>
                      <Link
                        href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), selected: account.id } }}
                        aria-current={selected?.id === account.id ? "true" : undefined}
                        className={`block border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 ${selected?.id === account.id ? "bg-blue-50 font-medium" : ""}`}
                      >
                        <span className="block truncate text-blue-700">{account.name}</span>
                        <span className="block truncate text-xs text-slate-500">{[account.billingCity, account.phone].filter(Boolean).join(" • ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <section className="min-w-0 flex-1 overflow-y-auto p-4">
                {selected ? (
                  <>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Account</p>
                        <h2 className="text-xl font-semibold">{selected.name}</h2>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/accounts/${selected.id}`} className={buttonClasses.neutral}>
                          Open
                        </Link>
                        <Link href={`/accounts/${selected.id}/edit`} className={buttonClasses.neutral}>
                          Edit
                        </Link>
                      </div>
                    </div>
                    <AccountDetails account={selected} compact />
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-500">
                    <h2 className="text-lg font-semibold text-slate-700">No record selected</h2>
                    <p className="text-sm">Select an item from this list to open it.</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              <AccountsTable items={result.items} columns={columns} cells={cells} sortField={result.sortField} sortDirection={result.sortDirection} sortable={result.sortable} pageOffset={(result.page - 1) * result.pageSize} />
              {totalPages > 1 && display === "table" ? (
                <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
                  <span>
                    Page {result.page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {result.page > 1 ? (
                      <Link href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), page: String(result.page - 1) } }} className="text-blue-700 hover:underline">
                        Previous
                      </Link>
                    ) : null}
                    {result.page < totalPages ? (
                      <Link href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), page: String(result.page + 1) } }} className="text-blue-700 hover:underline">
                        Next
                      </Link>
                    ) : null}
                  </div>
                </nav>
              ) : null}
            </>
          )}
          {totalPages > 1 && display !== "table" ? (
            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs">
              <span>Page {result.page} of {totalPages}</span>
              <div className="flex gap-3">
                {result.page > 1 ? <Link href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), page: String(result.page - 1) } }}>Previous</Link> : null}
                {result.page < totalPages ? <Link href={{ pathname: "/accounts", query: { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, single(v)])), page: String(result.page + 1) } }}>Next</Link> : null}
              </div>
            </nav>
          ) : null}
        </main>
        {filtersOpen ? <FilterPanel key={`${view.id}-${view.updatedAt.toISOString()}`} view={viewDto} fields={filterFieldOptions()} /> : null}
      </div>
    </div>
  );
}

function EmptyState({ q, hasFilters, scope }: { q: string; hasFilters: boolean; scope: string }) {
  const filtered = q || hasFilters || scope !== "ALL";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div aria-hidden className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-4xl text-indigo-500">
        ▦
      </div>
      <h2 className="text-xl font-semibold text-slate-800">{filtered ? "No items to display." : "Accounts show where your contacts work"}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-600">
        {filtered ? "Try another list view, clear the search, or remove filters." : "Improve your reporting and deal tracking with accounts."}
      </p>
      {!filtered ? (
        <Link href="/accounts/new" className={`${buttonClasses.brand} mt-4`}>
          Add an Account
        </Link>
      ) : null}
    </div>
  );
}

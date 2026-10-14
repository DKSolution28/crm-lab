import Link from "next/link";
import type { Metadata } from "next";
import { ListSearch } from "@/components/accounts/list-search";
import { RefreshButton } from "@/components/accounts/refresh-button";
import { ContactFilters } from "@/components/contacts/contact-filters";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactScope } from "@/components/contacts/scope-switcher";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { FilterError, contactFilterFields, parseFiltersQuery } from "@/lib/contacts/filters";
import { getContactField } from "@/lib/contacts/fields";
import { listContacts, type ContactListResult } from "@/lib/contacts/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contacts | CRM Lab" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const COLUMNS = [
  { key: "lastName", label: "Name", sortable: true },
  { key: "accountName", label: "Account", sortable: true },
  { key: "title", label: "Title", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "phone", label: "Phone", sortable: true },
  { key: "ownerAlias", label: "Owner", sortable: true },
];

function FilterProblem({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
      <h2 className="text-lg font-semibold text-slate-800">These filters could not be applied.</h2>
      <p className="max-w-md text-sm text-slate-600">{message}</p>
      <Link href="/contacts" className={buttonClasses.neutral}>
        Clear filters
      </Link>
    </div>
  );
}

function EmptyState({ q, filtered, scope }: { q: string; filtered: boolean; scope: string }) {
  const detail = q ? `No contacts match “${q}”.` : filtered ? "No contacts match these filters." : scope === "mine" ? "You do not own any contacts yet." : scope === "recent" ? "You have not opened a contact yet." : "No contacts yet.";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-800">No items to display.</h2>
      <p className="text-sm text-slate-600">{detail}</p>
      {!q && !filtered && scope === "all" ? (
        <Link href="/contacts/new" className={buttonClasses.brand}>
          New Contact
        </Link>
      ) : null}
    </div>
  );
}

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const q = single(params.q);
  const scopeParam = single(params.scope);
  const scope = scopeParam === "mine" || scopeParam === "recent" ? scopeParam : "all";
  const page = Math.max(1, Number(single(params.page)) || 1);
  const filtersOpen = single(params.filterPanel) === "1";
  const toast = parseToast(params.toast);
  const preserved = Object.fromEntries(Object.entries(params).flatMap(([key, value]) => (single(value) ? [[key, single(value)]] : [])));

  let result: ContactListResult;
  try {
    result = await listContacts(user, {
      q,
      sortField: single(params.sort) || null,
      sortDirection: single(params.dir) === "desc" ? "desc" : single(params.dir) === "asc" ? "asc" : null,
      page,
      pageSize: 50,
      scope,
      filters: single(params.filters) || null,
      filterLogic: single(params.filterLogic) || null,
    });
  } catch (error) {
    if (error instanceof FilterError) return <FilterProblem message={error.message} />;
    throw error;
  }

  const sortLabel = result.sortField ? (result.sortField === "lastName" ? "Name" : getContactField(result.sortField)?.label) : null;
  const scopeLabel = result.scope === "mine" ? "My contacts" : result.scope === "recent" ? "Recently viewed" : "All contacts";
  const filterCount = single(params.filters) ? parseFiltersQuery(single(params.filters)).length : 0;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const summary = `${result.total} item${result.total === 1 ? "" : "s"} • ${result.scope === "recent" ? "Sorted by recently viewed • " : sortLabel ? `Sorted by ${sortLabel} • ` : ""}Filtered by ${scopeLabel}${filterCount ? ` + ${filterCount} filter` : ""}${q ? ` • Search: “${q}”` : ""}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="border-b border-slate-200 bg-white px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded bg-[#7f8de1] text-lg text-white">
              ☺
            </span>
            <div>
              <p className="text-xs text-slate-500">Contacts</p>
              <h1 className="text-lg font-semibold text-slate-900">All Contacts</h1>
            </div>
          </div>
          <Link href="/contacts/new" className={buttonClasses.neutral}>
            New
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600" role="status">
            {summary}
          </p>
          <div className="flex items-center gap-1">
            <ContactScope scope={result.scope} />
            <ListSearch initial={q} />
            <RefreshButton />
            <Link
              href={{ pathname: "/contacts", query: { ...preserved, filterPanel: filtersOpen ? undefined : "1" } }}
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
            <EmptyState q={q} filtered={filterCount > 0} scope={result.scope} />
          ) : (
            <>
              <ContactsTable items={result.items} columns={COLUMNS} sortField={result.sortField} sortDirection={result.sortDirection} sortable={result.scope !== "recent"} />
              {totalPages > 1 ? (
                <nav aria-label="Pagination" className="mt-auto flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
                  <span>
                    Page {result.page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {result.page > 1 ? (
                      <Link href={{ pathname: "/contacts", query: { ...preserved, page: String(result.page - 1) } }} className="text-blue-700 hover:underline">
                        Previous
                      </Link>
                    ) : null}
                    {result.page < totalPages ? (
                      <Link href={{ pathname: "/contacts", query: { ...preserved, page: String(result.page + 1) } }} className="text-blue-700 hover:underline">
                        Next
                      </Link>
                    ) : null}
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </main>
        {filtersOpen ? <ContactFilters fields={contactFilterFields()} /> : null}
      </div>
    </div>
  );
}

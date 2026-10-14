import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AccountDetails } from "@/components/accounts/account-details";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditAccount } from "@/lib/auth/policies";
import { formatCurrency, formatDate } from "@/lib/accounts/format";
import { picklistLabel } from "@/lib/accounts/picklists";
import { getAccountWithRelated, recordView } from "@/lib/accounts/service";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const account = await getAccountWithRelated(id);
  return { title: account ? `${account.name} | Account | CRM Lab` : "Account | CRM Lab" };
}

// Page d'enregistrement Account. Non observée dans Salesforce (aucun
// enregistrement dans l'org) : structure déduite du layout « Account Layout »
// (SET-1 : sections About / Get in Touch / History, listes associées
// Contacts et Opportunities) et conçue pour CRM Lab.
export default async function AccountRecordPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const account = await getAccountWithRelated(id);
  if (!account) notFound();
  await recordView(account.id, user);

  const tab = (Array.isArray(query.tab) ? query.tab[0] : query.tab) === "related" ? "related" : "details";
  const toast = parseToast(query.toast);
  const editable = canEditAccount(user, account);

  const highlights = [
    { label: "Type", value: account.type ? picklistLabel("type", account.type) : "" },
    { label: "Phone", value: account.phone ?? "" },
    { label: "Website", value: account.website ?? "", href: account.website ?? undefined },
    { label: "Account Owner", value: `${account.owner.firstName} ${account.owner.lastName}` },
  ];

  const relatedLists = [
    { key: "contacts", label: "Contacts", count: account.contacts.length },
    { key: "opportunities", label: "Opportunities", count: account.opportunities.length },
    { key: "children", label: "Child Accounts", count: account.children.length },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-4">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}

      <header className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded bg-[#7f8de1] text-xl text-white">
              ▦
            </span>
            <div>
              <p className="text-xs text-slate-500">Account</p>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="account-name">
                {account.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/accounts" className={buttonClasses.neutral}>
              Back to list
            </Link>
            {editable ? (
              <Link href={`/accounts/${account.id}/edit`} className={buttonClasses.neutral}>
                Edit
              </Link>
            ) : (
              <span className={`${buttonClasses.neutral} cursor-not-allowed opacity-60`} title="You can only edit accounts you own." aria-disabled="true">
                Edit
              </span>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 md:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs text-slate-500">{item.label}</dt>
              <dd className="truncate text-sm text-slate-900">
                {item.href && item.value ? (
                  <a href={item.href} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                    {item.value}
                  </a>
                ) : (
                  item.value || <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white">
        <nav role="tablist" aria-label="Record sections" className="flex border-b border-slate-200 px-4">
          {(["details", "related"] as const).map((key) => (
            <Link
              key={key}
              role="tab"
              aria-selected={tab === key}
              href={{ pathname: `/accounts/${account.id}`, query: key === "details" ? {} : { tab: key } }}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === key ? "border-blue-700 text-blue-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}
            >
              {key === "details" ? "Details" : "Related"}
            </Link>
          ))}
        </nav>

        <div role="tabpanel" className="p-4">
          {tab === "details" ? (
            <AccountDetails account={account} />
          ) : (
            <div className="flex flex-col gap-6">
              <ul className="flex flex-wrap gap-2 text-xs">
                {relatedLists.map((list) => (
                  <li key={list.key}>
                    <a href={`#related-${list.key}`} className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">
                      {list.label} ({list.count})
                    </a>
                  </li>
                ))}
              </ul>

              <section id="related-contacts" aria-labelledby="related-contacts-title">
                <h3 id="related-contacts-title" className="mb-2 text-sm font-semibold text-slate-800">
                  Contacts ({account.contacts.length})
                </h3>
                {account.contacts.length === 0 ? (
                  <p className="text-sm text-slate-500">No contacts are linked to this account yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-1 font-medium">Name</th>
                        <th className="py-1 font-medium">Title</th>
                        <th className="py-1 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.contacts.map((contact) => (
                        <tr key={contact.id} className="border-t border-slate-100">
                          <td className="py-1">
                            {contact.firstName} {contact.lastName}
                          </td>
                          <td className="py-1 text-slate-700">{contact.title ?? ""}</td>
                          <td className="py-1 text-slate-700">{contact.email ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section id="related-opportunities" aria-labelledby="related-opportunities-title">
                <h3 id="related-opportunities-title" className="mb-2 text-sm font-semibold text-slate-800">
                  Opportunities ({account.opportunities.length})
                </h3>
                {account.opportunities.length === 0 ? (
                  <p className="text-sm text-slate-500">No opportunities are linked to this account yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-1 font-medium">Opportunity Name</th>
                        <th className="py-1 font-medium">Stage</th>
                        <th className="py-1 font-medium">Amount</th>
                        <th className="py-1 font-medium">Close Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.opportunities.map((opportunity) => (
                        <tr key={opportunity.id} className="border-t border-slate-100">
                          <td className="py-1">{opportunity.name}</td>
                          <td className="py-1 text-slate-700">{opportunity.stageName}</td>
                          <td className="py-1 text-slate-700">{formatCurrency(opportunity.amount)}</td>
                          <td className="py-1 text-slate-700">{formatDate(opportunity.closeDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section id="related-children" aria-labelledby="related-children-title">
                <h3 id="related-children-title" className="mb-2 text-sm font-semibold text-slate-800">
                  Child Accounts ({account.children.length})
                </h3>
                {account.children.length === 0 ? (
                  <p className="text-sm text-slate-500">No account references this one as parent.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {account.children.map((child) => (
                      <li key={child.id}>
                        <Link href={`/accounts/${child.id}`} className="text-blue-700 hover:underline">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

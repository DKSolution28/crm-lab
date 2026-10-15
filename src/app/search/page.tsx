import Link from "next/link";
import type { Metadata } from "next";
import { formatFieldValue } from "@/lib/accounts/format";
import { globalSearch } from "@/lib/accounts/service";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search | CRM Lab" };

// NAV-3 (observé) : page de résultats « Top Results » avec compteurs par
// objet et message d'absence de résultat. Seul l'objet Accounts est
// interrogé dans CRM Lab (Contacts / Opportunities : modules à venir).
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await getCurrentUser();
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const result = q ? await globalSearch(q) : { items: [], total: 0 };
  const objects = [
    { label: "Accounts", count: result.total, available: true },
    { label: "Contacts", count: 0, available: false },
    { label: "Opportunities", count: 0, available: false },
  ];

  return (
    <div className="flex min-h-0 flex-1 bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search Results</h2>
        <ul className="flex flex-col gap-1 text-sm">
          <li className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-800">Top Results</li>
          {objects.map((object) => (
            <li key={object.label} className={`flex justify-between px-2 py-1 ${object.available ? "text-slate-800" : "text-slate-400"}`} title={object.available ? undefined : "Module à venir"}>
              <span>{object.label}</span>
              <span>{object.count}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <h1 className="text-xl font-semibold text-slate-900">{q ? `${q} - Search` : "Search"}</h1>
        {!q ? (
          <p className="mt-2 text-sm text-slate-600">Type a term in the search box to find accounts by name, account number, phone, website, city, site or ticker symbol.</p>
        ) : result.total === 0 ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-800">We searched the objects you use most and didn&apos;t find any matches for &quot;{q}&quot;.</p>
            <p className="mt-2 text-sm text-slate-600">Know which object you&apos;re looking for? Select it in the sidebar, or open the Accounts list and use “Search this list...”.</p>
          </div>
        ) : (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white" aria-labelledby="results-accounts">
            <h2 id="results-accounts" className="border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
              Accounts ({result.total}{result.total > result.items.length ? `, showing ${result.items.length}` : ""})
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Account Name</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Billing City</th>
                  <th className="px-4 py-2 font-medium">Account Owner Alias</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((account) => (
                  <tr key={account.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link href={`/accounts/${account.id}`} className="text-blue-700 hover:underline">
                        {account.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{formatFieldValue(account, "phone")}</td>
                    <td className="px-4 py-2 text-slate-700">{formatFieldValue(account, "billingCity")}</td>
                    <td className="px-4 py-2 text-slate-700">{formatFieldValue(account, "ownerAlias")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

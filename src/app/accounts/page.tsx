import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { NewAccountForm } from "./new-account-form";

async function AccountsTable() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, opportunities: true } } },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm" data-testid="accounts-table">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60">
          <tr>
            <th className="px-4 py-2 font-medium">Nom</th>
            <th className="px-4 py-2 font-medium">Secteur</th>
            <th className="px-4 py-2 font-medium">Ville</th>
            <th className="px-4 py-2 text-right font-medium">Contacts</th>
            <th className="px-4 py-2 text-right font-medium">Opportunités</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                Aucun compte pour le moment.
              </td>
            </tr>
          )}
          {accounts.map((account) => (
            <tr key={account.id} className="border-t border-zinc-100 dark:border-zinc-800" data-testid="account-row">
              <td className="px-4 py-2 font-medium">{account.name}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{account.industry ?? "—"}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{account.billingCity ?? "—"}</td>
              <td className="px-4 py-2 text-right tabular-nums">{account._count.contacts}</td>
              <td className="px-4 py-2 text-right tabular-nums">{account._count.opportunities}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Comptes</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Équivalent fonctionnel de l&apos;objet Salesforce <code>Account</code>.
      </p>
      <div className="mt-6">
        <NewAccountForm />
      </div>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Chargement des comptes…</p>}>
          <AccountsTable />
        </Suspense>
      </div>
    </div>
  );
}

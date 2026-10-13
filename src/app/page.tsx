import { Suspense } from "react";
import { connection } from "next/server";
import { getPrisma } from "@/lib/prisma";

async function AccountList() {
  await connection();
  let accounts;
  try {
    accounts = await getPrisma().account.findMany({
      orderBy: { name: "asc" },
      take: 10,
      include: { _count: { select: { contacts: true, opportunities: true } } },
    });
  } catch {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Base de données indisponible. Lancez <code>bash scripts/cloud-start.sh</code>.
      </p>
    );
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucun compte. Lancez <code>npm run db:seed</code>.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {accounts.map((account) => (
        <li key={account.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium text-zinc-900">{account.name}</p>
            <p className="text-xs text-zinc-500">
              {[account.industry, account.billingCity].filter(Boolean).join(" · ")}
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {account._count.contacts} contact(s) · {account._count.opportunities} opportunité(s)
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16 font-sans">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">CRM Lab</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Reconstruction fonctionnelle d&apos;un CRM de démonstration
        </h1>
        <p className="text-zinc-600">
          Next.js, TypeScript, Tailwind CSS, PostgreSQL et Prisma. Analyse autorisée
          d&apos;une application Salesforce de démonstration.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Comptes</h2>
        <Suspense fallback={<p className="text-sm text-zinc-500">Chargement…</p>}>
          <AccountList />
        </Suspense>
      </section>
    </main>
  );
}

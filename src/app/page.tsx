import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: "Prospection",
  QUALIFICATION: "Qualification",
  PROPOSAL: "Proposition",
  NEGOTIATION: "Négociation",
  CLOSED_WON: "Gagnée",
  CLOSED_LOST: "Perdue",
};

async function DashboardStats() {
  const [accounts, contacts, opportunities, pipeline] = await Promise.all([
    prisma.account.count(),
    prisma.contact.count(),
    prisma.opportunity.count(),
    prisma.opportunity.groupBy({
      by: ["stage"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const cards = [
    { label: "Comptes", value: accounts, href: "/accounts" },
    { label: "Contacts", value: contacts },
    { label: "Opportunités", value: opportunities },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3" data-testid="dashboard-stats">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid={`stat-${card.label.toLowerCase()}`}>
              {card.value}
            </p>
            {card.href && (
              <Link href={card.href} className="mt-2 inline-block text-sm text-sky-700 hover:underline dark:text-sky-400">
                Voir la liste →
              </Link>
            )}
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Pipeline par étape</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2 font-medium">Étape</th>
                <th className="px-4 py-2 font-medium">Opportunités</th>
                <th className="px-4 py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    Aucune opportunité. Lancez <code>npm run db:seed</code> pour charger les données de démo.
                  </td>
                </tr>
              )}
              {pipeline.map((row) => (
                <tr key={row.stage} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2">{STAGE_LABELS[row.stage] ?? row.stage}</td>
                  <td className="px-4 py-2 tabular-nums">{row._count._all}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row._sum.amount
                      ? Number(row._sum.amount).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Laboratoire de ré-implémentation fonctionnelle d&apos;une application Salesforce de démonstration.
        Les données ci-dessous proviennent de PostgreSQL via Prisma.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Chargement des indicateurs…</p>}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  );
}

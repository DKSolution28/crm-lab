import { getHealth } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { NoteForm } from "./note-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();
  const notes = health.databaseReachable
    ? await prisma.labNote.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      })
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">
          CRM Lab
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink">
          Reverse engineering fonctionnel autorisé d&apos;une démo Salesforce
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          Environnement Cloud Agent avec Next.js, PostgreSQL/Prisma, Playwright
          Chromium et REA 6.4.0. Aucun secret de production n&apos;est stocké
          dans le dépôt.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-line bg-panel p-6 shadow-[0_20px_50px_rgba(43,33,24,0.06)]">
          <h2 className="text-xl font-semibold text-ink">État de l&apos;environnement</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <StatusRow label="Node.js" value={health.node} ok />
            <StatusRow
              label="PostgreSQL"
              value={
                health.databaseReachable
                  ? "joignable"
                  : health.databaseConfigured
                    ? "configuré, injoignable"
                    : "DATABASE_URL absent"
              }
              ok={health.databaseReachable}
            />
            <StatusRow
              label="Notes Prisma"
              value={health.noteCount === null ? "n/a" : String(health.noteCount)}
              ok={health.noteCount !== null}
            />
          </dl>
        </article>

        <article className="rounded-3xl border border-line bg-panel p-6 shadow-[0_20px_50px_rgba(43,33,24,0.06)]">
          <h2 className="text-xl font-semibold text-ink">Nouvelle observation</h2>
          <p className="mt-2 mb-5 text-sm leading-6 text-muted">
            Écriture réelle dans PostgreSQL via Prisma, pour valider le flux
            hello-world du lab.
          </p>
          <NoteForm />
        </article>
      </section>

      <section className="rounded-3xl border border-line bg-panel p-6">
        <h2 className="text-xl font-semibold text-ink">Notes récentes</h2>
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucune note pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-2xl border border-line bg-white px-4 py-3"
                data-testid="lab-note"
              >
                <p className="font-medium text-ink">{note.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-mono text-xs ${ok ? "text-accent" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

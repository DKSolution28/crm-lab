import { connection } from "next/server";
import { createNote } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatCreatedAt(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

export default async function Home() {
  await connection();

  let database: "up" | "down" = "up";
  let notes: { id: string; title: string; detail: string; createdAt: Date }[] =
    [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    notes = await prisma.labNote.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch {
    database = "down";
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-zinc-500">CRM Lab</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Notes de laboratoire
            </h1>
          </div>
          <p
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              database === "up"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {database === "up" ? "PostgreSQL joignable" : "PostgreSQL indisponible"}
          </p>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Nouvelle note</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Enregistre une observation locale. Les identifiants d&apos;une
            organisation Salesforce restent hors du dépôt.
          </p>
          <form action={createNote} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Titre
              <input
                name="title"
                required
                maxLength={200}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-950 outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Détail
              <textarea
                name="detail"
                rows={5}
                maxLength={4000}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-950 outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Enregistrer
            </button>
          </form>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Notes enregistrées</h2>
          {notes.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700">
              Aucune note pour le moment.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-medium">{note.title}</h3>
                    <time
                      dateTime={note.createdAt.toISOString()}
                      className="shrink-0 text-xs text-zinc-500"
                    >
                      {formatCreatedAt(note.createdAt)}
                    </time>
                  </div>
                  {note.detail ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {note.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

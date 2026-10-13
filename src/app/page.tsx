export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="font-mono text-sm uppercase tracking-widest text-zinc-500">crm-lab</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Reverse engineering fonctionnel d&apos;une application Salesforce de démonstration
      </h1>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Périmètre autorisé uniquement. Les captures (écrans, DOM, HAR) sont pilotées par Playwright, analysées avec
        REA et stockées dans PostgreSQL via Prisma.
      </p>
      <ul className="flex flex-col gap-2 font-mono text-sm">
        <li>
          <a className="underline underline-offset-4" href="/api/health">
            /api/health
          </a>{" "}
          — état de l&apos;API et de la base de données
        </li>
      </ul>
    </main>
  );
}

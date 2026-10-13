const tools = [
  { name: "REA 6.4.0", detail: "Inventaire et observation autorisés" },
  { name: "Playwright", detail: "Automatisation Chromium reproductible" },
  { name: "Prisma + PostgreSQL", detail: "Modèle de données des captures" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
        Environnement de démonstration
      </p>
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950">
        Reverse engineering fonctionnel, traçable et autorisé.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        CRM Lab fournit une base locale pour analyser les parcours d’une
        application Salesforce de démonstration sans stocker d’identifiants
        réels dans le dépôt.
      </p>
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <article
            key={tool.name}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-slate-950">{tool.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tool.detail}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

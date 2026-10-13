export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Salesforce Reverse Engineering Lab
            </h1>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Next.js + Prisma PostgreSQL + Playwright + REA
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-8">
        <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white mb-2">
            Environnement opérationnel
          </h2>
          <p className="text-slate-400 text-sm max-w-3xl">
            Cet environnement Cursor Cloud est configuré pour l&apos;exploration, l&apos;analyse fonctionnelle
            et le reverse engineering automatisé d&apos;applications Salesforce de démonstration.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Stack Applicative</h3>
              <span className="text-xs text-emerald-400 font-mono">v16.4</span>
            </div>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• Next.js App Router & TypeScript</li>
              <li>• Tailwind CSS v4 styling</li>
              <li>• PostgreSQL avec Prisma ORM</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Automatisation Web</h3>
              <span className="text-xs text-emerald-400 font-mono">Chromium</span>
            </div>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• Playwright Test Suite</li>
              <li>• Navigateur Chromium headless/headful</li>
              <li>• Dépendances système installées</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Agents & REA</h3>
              <span className="text-xs text-emerald-400 font-mono">v6.4.0</span>
            </div>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li>• REA Agents CLI & MCP</li>
              <li>• Capabilities & Doctor opérationnels</li>
              <li>• Node.js 24 LTS runtime</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        Workspace Cursor Cloud Agent • Environnement certifié sans secrets sensibles
      </footer>
    </div>
  );
}

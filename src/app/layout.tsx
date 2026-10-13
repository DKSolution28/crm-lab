import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Lab",
  description:
    "Functional re-implementation lab for a Salesforce demo application (Next.js, Prisma, PostgreSQL).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-sm font-bold text-white">
                C
              </span>
              CRM Lab
            </Link>
            <div className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Tableau de bord
              </Link>
              <Link href="/accounts" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Comptes
              </Link>
              <a href="/api/health" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                /api/health
              </a>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          crm-lab · Next.js + TypeScript + Tailwind CSS · Prisma + PostgreSQL · REA + Playwright
        </footer>
      </body>
    </html>
  );
}

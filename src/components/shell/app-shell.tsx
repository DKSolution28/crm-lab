import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, listUsers } from "@/lib/auth/current-user";
import { GlobalSearch } from "./global-search";
import { NavLinks } from "./nav-links";
import { UserSwitcher } from "./user-switcher";

// Coque applicative : navigation verticale (observé : Home, Contacts, Accounts, …)
// et en-tête avec recherche globale. Contacts/Opportunities sont des
// emplacements préparatoires sans module dédié.
export async function AppShell({ children }: { children: ReactNode }) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let users: Awaited<ReturnType<typeof listUsers>> = [];
  try {
    [user, users] = await Promise.all([getCurrentUser(), listUsers()]);
  } catch {
    user = null;
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-20 shrink-0 flex-col items-center gap-1 bg-[#032d60] py-4 text-white">
        <Link href="/" className="mb-3 text-2xl font-bold" aria-label="CRM Lab home">
          ☁
        </Link>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-slate-100">
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
          <span className="text-sm font-semibold text-slate-700">CRM Lab</span>
          <div className="flex flex-1 justify-center">
            <GlobalSearch />
          </div>
          {user ? <UserSwitcher users={users} currentId={user.id} /> : <span className="text-xs text-red-700">PostgreSQL indisponible</span>}
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

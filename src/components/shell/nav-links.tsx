"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "⌂", enabled: true },
  { href: "/accounts", label: "Accounts", icon: "▦", enabled: true },
  { href: "/leads", label: "Leads", icon: "+", enabled: true },
  { href: "/contacts", label: "Contacts", icon: "☺", enabled: true },
  { href: "/opportunities", label: "Opportunities", icon: "◔", enabled: true },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex w-full flex-col items-stretch gap-1 px-2">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const base = "flex flex-col items-center gap-0.5 rounded px-1 py-2 text-[11px] leading-tight";
        if (!item.enabled) {
          return (
            <span key={item.href} className={`${base} cursor-not-allowed text-white/40`} title="Module à venir" aria-disabled="true">
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${base} ${active ? "bg-white/15 font-semibold" : "hover:bg-white/10"}`}
          >
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

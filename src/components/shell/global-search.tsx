"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Recherche globale (NAV-3) : saisie dans l'en-tête, résultats sur /search.
export function GlobalSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      role="search"
      className="relative w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Search Accounts and more
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search..."
        className="h-9 w-full rounded-full border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        ⌕
      </span>
    </form>
  );
}

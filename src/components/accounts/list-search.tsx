"use client";

import { useState } from "react";
import { useListUrl } from "./use-list-url";

// « Search this list... » (LST-7) : filtre la vue courante, bouton Clear.
export function ListSearch({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [syncedInitial, setSyncedInitial] = useState(initial);
  const { update } = useListUrl();
  if (syncedInitial !== initial) {
    setSyncedInitial(initial);
    setValue(initial);
  }

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        update({ q: value.trim() || null, page: null });
      }}
    >
      <label htmlFor="list-search" className="sr-only">
        Search this list...
      </label>
      <input
        id="list-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search this list..."
        className="h-8 w-56 rounded border border-slate-300 bg-white pl-7 pr-14 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
      />
      <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
        ⌕
      </span>
      {value || initial ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            update({ q: null, page: null });
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-xs text-blue-700 hover:bg-slate-100"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}

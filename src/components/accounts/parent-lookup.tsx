"use client";

import { useEffect, useRef, useState } from "react";
import { inputClasses } from "@/components/ui/modal";

type Suggestion = { id: string; name: string; billingCity: string | null };

// Lookup « Parent Account » (observé : combobox ; contenu déduit car l'org
// n'avait aucun enregistrement) : suggestions par nom, sélection unique.
export function ParentLookup({ initial, excludeId, error }: { initial: { id: string; name: string } | null; excludeId?: string | null; error?: string }) {
  const [selected, setSelected] = useState(initial);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: term });
    if (excludeId) params.set("exclude", excludeId);
    fetch(`/api/accounts/lookup?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items: Suggestion[] }) => setItems(data.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, [term, open, excludeId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={container} className="relative flex flex-col gap-1 text-sm">
      <label htmlFor="parent-lookup">Parent Account</label>
      <input type="hidden" name="parentId" value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex h-8 items-center justify-between rounded border border-slate-300 bg-slate-50 px-2">
          <span className="truncate">{selected.name}</span>
          <button type="button" aria-label="Clear Parent Account" onClick={() => setSelected(null)} className="px-1 text-slate-500 hover:text-slate-900">
            ×
          </button>
        </div>
      ) : (
        <input
          id="parent-lookup"
          role="combobox"
          aria-expanded={open}
          aria-controls="parent-lookup-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search Accounts..."
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          className={inputClasses}
        />
      )}
      {open && !selected ? (
        <ul id="parent-lookup-listbox" role="listbox" className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg">
          {items.length === 0 ? <li className="px-3 py-1.5 text-xs text-slate-500">No accounts match.</li> : null}
          {items.map((item) => (
            <li key={item.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => {
                  setSelected({ id: item.id, name: item.name });
                  setOpen(false);
                }}
                className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-100"
              >
                <span>{item.name}</span>
                {item.billingCity ? <span className="text-xs text-slate-500">{item.billingCity}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}

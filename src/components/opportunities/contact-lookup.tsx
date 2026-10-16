"use client";

import { useEffect, useRef, useState } from "react";
import { inputClasses } from "@/components/ui/modal";

type Suggestion = { id: string; firstName: string | null; lastName: string };

const labelFor = (contact: { firstName: string | null; lastName: string }) => [contact.firstName, contact.lastName].filter(Boolean).join(" ");

export function ContactLookup({
  initial,
  error,
}: {
  initial: { id: string; firstName: string | null; lastName: string } | null;
  error?: string;
}) {
  const [selected, setSelected] = useState(initial);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: term });
    fetch(`/api/contacts/lookup?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items: Suggestion[] }) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => setItems([]));
    return () => controller.abort();
  }, [term, open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={container} className="relative flex flex-col gap-1 text-sm">
      <label htmlFor="contact-lookup">Primary Contact</label>
      <input type="hidden" name="primaryContactId" value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex h-8 items-center justify-between rounded border border-slate-300 bg-slate-50 px-2">
          <span className="truncate">{labelFor(selected)}</span>
          <button type="button" aria-label="Clear Primary Contact" onClick={() => setSelected(null)} className="px-1 text-slate-500 hover:text-slate-900">
            ×
          </button>
        </div>
      ) : (
        <input
          id="contact-lookup"
          role="combobox"
          aria-expanded={open}
          aria-controls="contact-lookup-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search Contacts..."
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
        <ul id="contact-lookup-listbox" role="listbox" className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg">
          {items.length === 0 ? <li className="px-3 py-1.5 text-xs text-slate-500">No contacts match.</li> : null}
          {items.map((item) => (
            <li key={item.id} role="option" aria-selected="false">
              <button type="button" onClick={() => { setSelected(item); setOpen(false); }} className="flex w-full px-3 py-1.5 text-left hover:bg-slate-100">
                {labelFor(item)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}

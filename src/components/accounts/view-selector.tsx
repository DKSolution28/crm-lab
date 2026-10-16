"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { pinViewAction } from "@/app/accounts/actions";
import { useToast } from "@/components/ui/toast";
import type { ListViewDto } from "./types";
import { useListUrl } from "./use-list-url";

// Sélecteur de vue (LST-2) : liste déroulante avec « Search lists... » et épinglage.
export function ViewSelector({ views, current }: { views: ListViewDto[]; current: ListViewDto }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [pending, startTransition] = useTransition();
  const { update, refresh } = useListUrl();
  const { notify } = useToast();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = views.filter((view) => view.label.toLowerCase().includes(term.toLowerCase()));

  return (
    <div className="flex items-center gap-2" ref={container}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Select a List View: Accounts`}
          className="flex items-center gap-2 rounded px-1 text-2xl font-semibold text-slate-900 hover:bg-slate-200"
        >
          {current.label}
          <span aria-hidden className="text-sm">
            ▾
          </span>
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-30 mt-1 w-96 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            <input
              autoFocus
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls="list-views-listbox"
              aria-label="Search lists..."
              placeholder="Search lists..."
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="mb-2 h-8 w-full rounded border border-slate-300 px-2 text-sm"
            />
            <p className="px-2 py-1 text-xs font-semibold uppercase text-slate-500">List Views</p>
            <ul id="list-views-listbox" role="listbox" aria-label="List Views" className="max-h-72 overflow-y-auto">
              {filtered.map((view) => (
                <li key={view.id} role="option" aria-selected={view.id === current.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTerm("");
                      update({ view: view.developerName ?? view.id, page: null, sort: null, dir: null, selected: null });
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${view.id === current.id ? "bg-blue-50 font-medium" : ""}`}
                  >
                    <span className="w-4 text-blue-700">{view.id === current.id ? "✓" : ""}</span>
                    <span className="flex-1">
                      {view.label}
                      {view.pinned ? <span className="text-slate-500"> (Pinned list)</span> : null}
                    </span>
                    {!view.isSystem && view.visibility === "PRIVATE" ? <span className="text-xs text-slate-400">Private</span> : null}
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="px-2 py-2 text-sm text-slate-500">No list views match.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={current.pinned || pending}
        aria-label={current.pinned ? "This list is pinned." : "Pin this list view."}
        title={current.pinned ? "This list is pinned." : "Pin this list view."}
        onClick={() =>
          startTransition(async () => {
            const result = await pinViewAction(current.id);
            if (!result.ok) notify("error", result.error);
            else refresh();
          })
        }
        className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm ${current.pinned ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
      >
        ⚲
      </button>
    </div>
  );
}

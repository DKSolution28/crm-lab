"use client";

import { useEffect, useRef, useState } from "react";
import { useListUrl } from "@/components/accounts/use-list-url";
import { buttonClasses } from "@/components/ui/modal";

const MODES = [
  { value: "table", label: "Table", icon: "▤" },
  { value: "kanban", label: "Kanban", icon: "▥" },
] as const;

export function OpportunityDisplaySwitcher({ display }: { display: "table" | "kanban" }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const { update } = useListUrl();

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button type="button" aria-label="Select list display" title="Select list display" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={buttonClasses.icon}>
        {MODES.find((mode) => mode.value === display)?.icon}
      </button>
      {open ? (
        <ul role="menu" aria-label="Select list display" className="absolute right-0 top-full z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {MODES.map((mode) => (
            <li key={mode.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={display === mode.value}
                onClick={() => {
                  setOpen(false);
                  update({ display: mode.value === "table" ? null : "kanban", page: null });
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100"
              >
                <span className="w-4 text-blue-700">{display === mode.value ? "✓" : ""}</span>
                <span aria-hidden>{mode.icon}</span> {mode.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, buttonClasses, inputClasses } from "@/components/ui/modal";
import type { DisplayMode } from "./types";
import { useListUrl } from "./use-list-url";

type Option = { key: string; label: string };

const MODES: { value: DisplayMode; label: string; icon: string }[] = [
  { value: "table", label: "Table", icon: "▤" },
  { value: "kanban", label: "Kanban", icon: "▥" },
  { value: "split", label: "Split View", icon: "◧" },
];

// Modes d'affichage (LST-3, LST-5, LST-6). Le passage en Kanban ouvre « Kanban Settings »
// avec Group By obligatoire et Summarize By optionnel.
export function DisplaySwitcher({
  display,
  groupBy,
  summarizeBy,
  groupOptions,
  summaryOptions,
}: {
  display: DisplayMode;
  groupBy: string | null;
  summarizeBy: string | null;
  groupOptions: Option[];
  summaryOptions: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
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
      <button
        type="button"
        aria-label="Select list display"
        title="Select list display"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses.icon}
      >
        {MODES.find((mode) => mode.value === display)?.icon}
      </button>
      {open ? (
        <ul role="menu" aria-label="Select list display" className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {MODES.map((mode) => (
            <li key={mode.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={display === mode.value}
                onClick={() => {
                  setOpen(false);
                  if (mode.value === "kanban") setSettings(true);
                  else update({ display: mode.value === "table" ? null : mode.value, groupBy: null, summarizeBy: null, selected: null });
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
      {settings ? (
        <KanbanSettings
          groupBy={groupBy}
          summarizeBy={summarizeBy}
          groupOptions={groupOptions}
          summaryOptions={summaryOptions}
          onClose={() => setSettings(false)}
          onSave={(nextGroup, nextSummary) => {
            setSettings(false);
            update({ display: "kanban", groupBy: nextGroup, summarizeBy: nextSummary, selected: null });
          }}
        />
      ) : null}
    </div>
  );
}

export function KanbanSettings({
  groupBy,
  summarizeBy,
  groupOptions,
  summaryOptions,
  onClose,
  onSave,
}: {
  groupBy: string | null;
  summarizeBy: string | null;
  groupOptions: Option[];
  summaryOptions: Option[];
  onClose: () => void;
  onSave: (groupBy: string, summarizeBy: string | null) => void;
}) {
  const [group, setGroup] = useState(groupBy ?? "");
  const [summary, setSummary] = useState(summarizeBy ?? "");
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      title="Kanban Settings"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            onClick={() => {
              if (!group) {
                setError("Complete this field.");
                return;
              }
              onSave(group, summary || null);
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span>Summarize By</span>
          <select value={summary} onChange={(event) => setSummary(event.target.value)} className={inputClasses}>
            <option value="">-- None --</option>
            {summaryOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>
            Group By{" "}
            <abbr title="required" className="text-red-600 no-underline">
              *
            </abbr>
          </span>
          <select
            value={group}
            aria-invalid={!!error}
            onChange={(event) => {
              setGroup(event.target.value);
              setError(null);
            }}
            className={inputClasses}
          >
            <option value="">-- None --</option>
            {groupOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          {error ? <span className="text-xs text-red-700">{error}</span> : null}
        </label>
      </div>
    </Modal>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveFiltersAction } from "@/app/accounts/actions";
import { buttonClasses, inputClasses } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { FilterOperator, ListFilter } from "@/lib/accounts/filters";
import type { ListViewDto } from "./types";
import { useListUrl } from "./use-list-url";

export type FilterFieldOption = {
  key: string;
  label: string;
  kind: string;
  operators: { value: FilterOperator; label: string }[];
  options?: { value: string; label: string }[];
};

// Panneau Filters (FLT-1 à FLT-4) : Add Filter, Field / Operator / Value,
// Add Filter Logic, Remove All, Cancel / Save (la sauvegarde modifie la vue).
export function FilterPanel({ view, fields }: { view: ListViewDto; fields: FilterFieldOption[] }) {
  const [filters, setFilters] = useState<ListFilter[]>(view.filters);
  const [logic, setLogic] = useState(view.filterLogic ?? "");
  const [logicOpen, setLogicOpen] = useState(!!view.filterLogic);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();
  const { update, refresh } = useListUrl();

  const dirty = JSON.stringify(filters) !== JSON.stringify(view.filters) || (logic.trim() || "") !== (view.filterLogic ?? "");
  const readOnly = !view.canManage || view.scope === "RECENT";

  const fieldFor = (key: string) => fields.find((field) => field.key === key) ?? fields[0];

  const updateFilter = (index: number, changes: Partial<ListFilter>) =>
    setFilters((current) => current.map((filter, i) => (i === index ? { ...filter, ...changes } : filter)));

  const addFilter = () => {
    const first = fields[0];
    setFilters((current) => [...current, { field: first.key, operator: first.operators[0].value, value: "" }]);
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveFiltersAction(view.id, filters, logicOpen ? logic : null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      notify("success", "Filters were saved.");
      refresh();
    });

  return (
    <aside aria-label="Filters" className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold">Filters</h2>
        <button type="button" aria-label="Close Filters" onClick={() => update({ filters: null })} className="rounded px-2 text-lg text-slate-600 hover:bg-slate-100">
          ×
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        {readOnly ? (
          <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {view.scope === "RECENT" ? "Filters are unavailable on Recently Viewed." : "You cannot modify this list view. Clone it to filter it."}
          </p>
        ) : null}
        {error ? <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}
        <p className="mb-2 text-xs text-slate-500">Filtered by {view.scope === "MINE" ? "My accounts" : view.scope === "NEW_THIS_WEEK" ? "Created Date: this week" : "All accounts"}</p>
        {filters.length > 0 ? <h3 className="mb-2 font-medium">{logicOpen ? "Matching the filter logic" : "Matching all of these filters"}</h3> : null}
        <ol className="flex flex-col gap-3">
          {filters.map((filter, index) => {
            const definition = fieldFor(filter.field);
            const multi = !!definition.options;
            return (
              <li key={index} className="rounded border border-slate-200 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{index + 1}</span>
                  <button type="button" disabled={readOnly} onClick={() => setFilters(filters.filter((_, i) => i !== index))} className="text-xs text-blue-700 hover:underline disabled:text-slate-400">
                    Remove
                  </button>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs">Field</span>
                  <select
                    aria-label={`Field ${index + 1}`}
                    value={filter.field}
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = fieldFor(event.target.value);
                      updateFilter(index, { field: next.key, operator: next.operators[0].value, value: next.options ? [] : "" });
                    }}
                    className={inputClasses}
                  >
                    {fields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 flex flex-col gap-1">
                  <span className="text-xs">Operator</span>
                  <select
                    aria-label={`Operator ${index + 1}`}
                    value={filter.operator}
                    disabled={readOnly}
                    onChange={(event) => updateFilter(index, { operator: event.target.value as FilterOperator })}
                    className={inputClasses}
                  >
                    {definition.operators.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 flex flex-col gap-1">
                  <span className="text-xs">Value{multi && Array.isArray(filter.value) ? ` (${filter.value.length} options selected)` : ""}</span>
                  {multi ? (
                    <select
                      multiple
                      aria-label={`Value ${index + 1}`}
                      value={Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value] : []}
                      disabled={readOnly}
                      onChange={(event) => updateFilter(index, { value: [...event.target.selectedOptions].map((option) => option.value) })}
                      className="min-h-24 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      {definition.options!.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      aria-label={`Value ${index + 1}`}
                      type={definition.kind === "number" || definition.kind === "currency" ? "number" : definition.kind === "date" || definition.kind === "datetime" ? "date" : "text"}
                      value={Array.isArray(filter.value) ? filter.value.join(",") : filter.value}
                      disabled={readOnly}
                      onChange={(event) => updateFilter(index, { value: event.target.value })}
                      className={inputClasses}
                    />
                  )}
                </label>
              </li>
            );
          })}
        </ol>
        {filters.length === 0 ? <p className="rounded border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">No additional filters. Add a filter to narrow this list.</p> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={readOnly} onClick={addFilter} className="text-sm text-blue-700 hover:underline disabled:text-slate-400">
            Add Filter
          </button>
          {filters.length > 1 ? (
            <button type="button" disabled={readOnly} onClick={() => setLogicOpen((value) => !value)} className="text-sm text-blue-700 hover:underline disabled:text-slate-400">
              {logicOpen ? "Remove Filter Logic" : "Add Filter Logic"}
            </button>
          ) : null}
          {filters.length > 0 ? (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setFilters([]);
                setLogic("");
                setLogicOpen(false);
              }}
              className="text-sm text-blue-700 hover:underline disabled:text-slate-400"
            >
              Remove All
            </button>
          ) : null}
        </div>
        {logicOpen && filters.length > 1 ? (
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs">Filter Logic (ex. 1 AND (2 OR 3))</span>
            <input aria-label="Filter Logic" value={logic} disabled={readOnly} onChange={(event) => setLogic(event.target.value)} className={inputClasses} />
          </label>
        ) : null}
      </div>
      {dirty && !readOnly ? (
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            className={buttonClasses.neutral}
            onClick={() => {
              setFilters(view.filters);
              setLogic(view.filterLogic ?? "");
              setLogicOpen(!!view.filterLogic);
              setError(null);
            }}
          >
            Cancel
          </button>
          <button type="button" className={buttonClasses.brand} disabled={pending} onClick={save}>
            Save
          </button>
        </footer>
      ) : null}
    </aside>
  );
}

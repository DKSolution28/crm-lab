"use client";

import { useState } from "react";
import { useListUrl } from "@/components/accounts/use-list-url";
import { buttonClasses, inputClasses } from "@/components/ui/modal";

type FilterField = { key: string; label: string; operators: { value: string; label: string }[] };

export function ContactFilters({ fields }: { fields: FilterField[] }) {
  const { update, searchParams } = useListUrl();
  const initialField = fields[0]?.key ?? "lastName";
  const [field, setField] = useState(initialField);
  const operators = fields.find((item) => item.key === field)?.operators ?? [];
  const [operator, setOperator] = useState(operators[0]?.value ?? "contains");
  const [value, setValue] = useState("");
  const hasFilters = !!searchParams.get("filters");

  return (
    <aside aria-label="Filters" className="flex w-72 shrink-0 flex-col gap-3 border-l border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Field
        <select
          aria-label="Filter field"
          value={field}
          onChange={(event) => {
            const next = event.target.value;
            setField(next);
            const nextOperators = fields.find((item) => item.key === next)?.operators ?? [];
            setOperator(nextOperators[0]?.value ?? "equals");
          }}
          className={inputClasses}
        >
          {fields.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Operator
        <select aria-label="Filter operator" value={operator} onChange={(event) => setOperator(event.target.value)} className={inputClasses}>
          {operators.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Value
        <input aria-label="Filter value" value={value} onChange={(event) => setValue(event.target.value)} className={inputClasses} />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClasses.brand}
          onClick={() => update({ filters: JSON.stringify([{ field, operator, value }]), filterLogic: null, page: null })}
        >
          Apply filter
        </button>
        {hasFilters ? (
          <button type="button" className={buttonClasses.neutral} onClick={() => update({ filters: null, filterLogic: null, page: null })}>
            Clear filters
          </button>
        ) : null}
      </div>
    </aside>
  );
}

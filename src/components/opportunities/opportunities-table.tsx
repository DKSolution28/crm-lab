"use client";

import Link from "next/link";
import { useState } from "react";
import { useListUrl } from "@/components/accounts/use-list-url";
import type { OpportunityDto } from "@/lib/opportunities/service";

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: "name", label: "Opportunity Name", sortable: true },
  { key: "account", label: "Account", sortable: false },
  { key: "stageName", label: "Stage", sortable: true },
  { key: "amount", label: "Amount", sortable: true },
  { key: "closeDate", label: "Close Date", sortable: true },
  { key: "probability", label: "Probability", sortable: true },
  { key: "owner", label: "Owner", sortable: false },
];

export function OpportunitiesTable({
  items,
  sortField,
  sortDirection,
  pageOffset,
}: {
  items: OpportunityDto[];
  sortField: string;
  sortDirection: "asc" | "desc";
  pageOffset: number;
}) {
  const { update } = useListUrl();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const cell = (item: OpportunityDto, key: string) => {
    switch (key) {
      case "name":
        return (
          <Link href={`/opportunities/${item.id}`} className="font-medium text-blue-700 hover:underline">
            {item.name}
          </Link>
        );
      case "account":
        return item.account ? (
          <Link href={`/accounts/${item.account.id}`} className="text-blue-700 hover:underline">
            {item.account.name}
          </Link>
        ) : (
          ""
        );
      case "stageName":
        return item.stageName;
      case "amount":
        return item.amount ?? "";
      case "closeDate":
        return item.closeDate;
      case "probability":
        return item.probability === null ? "" : String(item.probability);
      case "owner":
        return item.owner.alias;
      default:
        return "";
    }
  };

  return (
    <div className="overflow-x-auto">
      {selected.size > 0 ? (
        <p role="status" className="border-b border-slate-200 bg-blue-50 px-4 py-1 text-xs text-blue-900">
          {selected.size} item{selected.size > 1 ? "s" : ""} selected
        </p>
      ) : null}
      <table className="w-full table-fixed border-collapse text-sm" aria-label="Opportunities">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="w-12 border-b border-slate-200 px-2 py-2 text-center">
              <span className="sr-only">Item Number</span>#
            </th>
            <th scope="col" className="w-8 border-b border-slate-200 px-2 py-2">
              <input type="checkbox" aria-label="Select All" checked={allSelected} onChange={toggleAll} />
            </th>
            {COLUMNS.map((column) => {
              const active = sortField === column.key;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined} className="border-b border-slate-200 px-2 py-2">
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => update({ sort: column.key, dir: active && sortDirection === "asc" ? "desc" : "asc", page: null })}
                      className="flex w-full items-center gap-1 truncate text-left hover:text-slate-900"
                      aria-label={`Sort ${column.label}`}
                    >
                      <span className="truncate">{column.label}</span>
                      <span aria-hidden className="text-slate-400">
                        {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span className="block truncate">{column.label}</span>
                  )}
                </th>
              );
            })}
            <th scope="col" className="w-20 border-b border-slate-200 px-2 py-2">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selected.has(item.id) ? "bg-blue-50/60" : ""}`}>
              <td className="px-2 py-2 text-center text-xs text-slate-500">{pageOffset + index + 1}</td>
              <td className="px-2 py-2">
                <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              </td>
              {COLUMNS.map((column) => (
                <td key={column.key} className="truncate px-2 py-2">
                  {cell(item, column.key)}
                </td>
              ))}
              <td className="px-2 py-2">
                <Link href={`/opportunities/${item.id}/edit`} className="text-xs text-blue-700 hover:underline" aria-label={`Edit ${item.name}`}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

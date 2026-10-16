"use client";

import Link from "next/link";
import { useState } from "react";
import type { AccountDto } from "@/lib/accounts/service";
import { useListUrl } from "./use-list-url";

type Column = { key: string; label: string; sortable: boolean };

export function AccountsTable({
  items,
  columns,
  cells,
  sortField,
  sortDirection,
  sortable,
  pageOffset,
}: {
  items: AccountDto[];
  columns: Column[];
  /** Valeurs formatées côté serveur : cells[accountId][columnKey]. */
  cells: Record<string, Record<string, string>>;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  sortable: boolean;
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

  return (
    <div className="overflow-x-auto">
      {selected.size > 0 ? (
        <p role="status" className="border-b border-slate-200 bg-blue-50 px-4 py-1 text-xs text-blue-900">
          {selected.size} item{selected.size > 1 ? "s" : ""} selected
        </p>
      ) : null}
      <table className="w-full table-fixed border-collapse text-sm" aria-label="Accounts">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="w-12 border-b border-slate-200 px-2 py-2 text-center">
              <span className="sr-only">Item Number</span>#
            </th>
            <th scope="col" className="w-8 border-b border-slate-200 px-2 py-2">
              <input type="checkbox" aria-label="Select All" checked={allSelected} onChange={toggleAll} />
            </th>
            {columns.map((column) => {
              const active = sortField === column.key;
              const canSort = sortable && column.sortable;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined} className="border-b border-slate-200 px-2 py-2">
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => update({ sort: column.key, dir: active && sortDirection === "asc" ? "desc" : "asc", page: null })}
                      className="flex w-full items-center gap-1 truncate text-left hover:text-slate-900"
                      aria-label={`Sort ${column.label}`}
                      title={`Sort ${column.label}`}
                    >
                      <span className="truncate">{column.label}</span>
                      <span aria-hidden className="text-slate-400">
                        {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span className="block truncate" title={sortable ? undefined : "Column sort is unavailable for this list view."}>
                      {column.label}
                    </span>
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
          {items.map((account, index) => (
            <tr key={account.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selected.has(account.id) ? "bg-blue-50/60" : ""}`}>
              <td className="px-2 py-2 text-center text-xs text-slate-500">{pageOffset + index + 1}</td>
              <td className="px-2 py-2">
                <input type="checkbox" aria-label={`Select ${account.name}`} checked={selected.has(account.id)} onChange={() => toggle(account.id)} />
              </td>
              {columns.map((column) => (
                <td key={column.key} className="truncate px-2 py-2" title={cells[account.id]?.[column.key] ?? ""}>
                  {column.key === "name" ? (
                    <Link href={`/accounts/${account.id}`} className="font-medium text-blue-700 hover:underline">
                      {account.name}
                    </Link>
                  ) : column.key === "website" && account.website ? (
                    <a href={account.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                      {account.website}
                    </a>
                  ) : (
                    cells[account.id]?.[column.key] ?? ""
                  )}
                </td>
              ))}
              <td className="px-2 py-2">
                <Link href={`/accounts/${account.id}/edit`} className="text-xs text-blue-700 hover:underline" aria-label={`Edit ${account.name}`}>
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

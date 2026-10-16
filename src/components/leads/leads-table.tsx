"use client";

import Link from "next/link";
import { useListUrl } from "@/components/accounts/use-list-url";

export type LeadRow = {
  id: string;
  name: string;
  company: string;
  status: string;
  qualified: string;
  email: string;
  phone: string;
  owner: string;
  converted: boolean;
};

const COLUMNS = [
  { key: "lastName", label: "Name" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "qualified", label: "Qualified" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "ownerAlias", label: "Owner" },
] as const;

export function LeadsTable({
  items,
  sortField,
  sortDirection,
  sortable,
}: {
  items: LeadRow[];
  sortField: string;
  sortDirection: "asc" | "desc";
  sortable: boolean;
}) {
  const { update } = useListUrl();
  const cell = (row: LeadRow, key: (typeof COLUMNS)[number]["key"]) => {
    switch (key) {
      case "lastName":
        return row.name;
      case "company":
        return row.company;
      case "status":
        return row.status;
      case "qualified":
        return row.qualified;
      case "email":
        return row.email;
      case "phone":
        return row.phone;
      case "ownerAlias":
        return row.owner;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm" aria-label="Leads">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {COLUMNS.map((column) => {
              const active = sortField === column.key;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined} className="border-b border-slate-200 px-2 py-2">
                  {sortable ? (
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
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              {COLUMNS.map((column) => (
                <td key={column.key} className="truncate px-2 py-2" title={cell(row, column.key)}>
                  {column.key === "lastName" ? (
                    <Link href={`/leads/${row.id}`} className="font-medium text-blue-700 hover:underline">
                      {row.name}
                    </Link>
                  ) : (
                    cell(row, column.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { contactName } from "@/lib/contacts/format";
import type { ContactDto } from "@/lib/contacts/service";
import { useListUrl } from "@/components/accounts/use-list-url";

type Column = { key: string; label: string; sortable: boolean };

const cellText = (contact: ContactDto, key: string) => {
  switch (key) {
    case "lastName":
      return contactName(contact);
    case "title":
      return contact.title ?? "";
    case "email":
      return contact.email ?? "";
    case "phone":
      return contact.phone ?? "";
    case "accountName":
      return contact.account?.name ?? "";
    case "ownerAlias":
      return contact.owner.alias;
    default:
      return "";
  }
};

export function ContactsTable({
  items,
  columns,
  sortField,
  sortDirection,
  sortable,
}: {
  items: ContactDto[];
  columns: Column[];
  sortField: string | null;
  sortDirection: "asc" | "desc";
  sortable: boolean;
}) {
  const { update } = useListUrl();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" aria-label="Contacts">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {columns.map((column) => {
              const active = sortField === column.key;
              const canSort = sortable && column.sortable;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined} className="border-b border-slate-200 px-3 py-2">
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => update({ sort: column.key, dir: active && sortDirection === "asc" ? "desc" : "asc", page: null })}
                      className="flex items-center gap-1 hover:text-slate-900"
                      aria-label={`Sort ${column.label}`}
                    >
                      <span>{column.label}</span>
                      <span aria-hidden className="text-slate-400">
                        {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span title={sortable ? undefined : "Column sort is unavailable for this list."}>{column.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((contact) => (
            <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-slate-800">
                  {column.key === "lastName" ? (
                    <Link href={`/contacts/${contact.id}`} className="text-blue-700 hover:underline">
                      {contactName(contact)}
                    </Link>
                  ) : column.key === "accountName" && contact.account ? (
                    <Link href={`/accounts/${contact.account.id}`} className="text-blue-700 hover:underline">
                      {contact.account.name}
                    </Link>
                  ) : (
                    cellText(contact, column.key) || <span className="text-slate-300">—</span>
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

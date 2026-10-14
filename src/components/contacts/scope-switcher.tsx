"use client";

import { useListUrl } from "@/components/accounts/use-list-url";

export function ContactScope({ scope }: { scope: "all" | "mine" | "recent" }) {
  const { update } = useListUrl();
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="sr-only">Contact list scope</span>
      <select
        aria-label="Contact list scope"
        value={scope}
        onChange={(event) => {
          const next = event.target.value;
          update({
            scope: next === "all" ? null : next,
            page: null,
            ...(next === "recent" ? { sort: null, dir: null } : {}),
          });
        }}
        className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900"
      >
        <option value="all">All contacts</option>
        <option value="mine">My contacts</option>
        <option value="recent">Recently viewed</option>
      </select>
    </label>
  );
}

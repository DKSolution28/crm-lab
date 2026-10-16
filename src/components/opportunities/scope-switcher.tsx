"use client";

import { useListUrl } from "@/components/accounts/use-list-url";

const OPTIONS: { value: "all" | "mine" | "recent"; label: string }[] = [
  { value: "all", label: "All opportunities" },
  { value: "mine", label: "My opportunities" },
  { value: "recent", label: "Recently viewed" },
];

export function ScopeSwitcher({ scope }: { scope: "all" | "mine" | "recent" }) {
  const { update } = useListUrl();
  return (
    <div role="group" aria-label="Opportunity scope" className="flex overflow-hidden rounded border border-slate-300 text-xs">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={scope === option.value}
          onClick={() => update({ scope: option.value === "all" ? null : option.value, page: null })}
          className={`px-2 py-1 ${scope === option.value ? "bg-blue-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

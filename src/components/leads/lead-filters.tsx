"use client";

import { useListUrl } from "@/components/accounts/use-list-url";
import { buttonClasses, inputClasses } from "@/components/ui/modal";

const STATUSES = ["New", "Working", "Unqualified", "Converted"];

export function LeadFilters({ status, qualified }: { status: string; qualified: string }) {
  const { update } = useListUrl();
  const apply = (nextStatus: string, nextQualified: string) => {
    const filters: { field: string; operator: "equals"; value: string }[] = [];
    if (nextStatus) filters.push({ field: "status", operator: "equals", value: nextStatus });
    if (nextQualified) filters.push({ field: "qualified", operator: "equals", value: nextQualified });
    update({
      filters: filters.length > 0 ? JSON.stringify(filters) : null,
      filterLogic: null,
      page: null,
    });
  };

  return (
    <form
      key={`${status}:${qualified}`}
      className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2"
      aria-label="Lead filters"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        apply(String(data.get("status") ?? ""), String(data.get("qualified") ?? ""));
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Status filter
        <select name="status" defaultValue={status} aria-label="Status filter" className={inputClasses}>
          <option value="">Any status</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Qualified filter
        <select name="qualified" defaultValue={qualified} aria-label="Qualified filter" className={inputClasses}>
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      <button type="submit" className={buttonClasses.neutral}>
        Apply filters
      </button>
      {status || qualified ? (
        <button type="button" className={buttonClasses.neutral} onClick={() => apply("", "")}>
          Clear filters
        </button>
      ) : null}
    </form>
  );
}

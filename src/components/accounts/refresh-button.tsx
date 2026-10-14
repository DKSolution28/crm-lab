"use client";

import { useTransition } from "react";
import { buttonClasses } from "@/components/ui/modal";
import { useListUrl } from "./use-list-url";

export function RefreshButton() {
  const { refresh } = useListUrl();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" aria-label="Refresh" title="Refresh" disabled={pending} onClick={() => startTransition(() => refresh())} className={buttonClasses.icon}>
      <span className={pending ? "animate-spin" : ""} aria-hidden>
        ↻
      </span>
    </button>
  );
}

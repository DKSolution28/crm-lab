"use client";

import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/modal";

export default function OpportunitiesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
      <h2 className="text-lg font-semibold text-slate-800">Something went wrong while loading opportunities.</h2>
      <p className="max-w-md text-sm text-slate-600">{error.message || "The database may be unavailable."}</p>
      <button type="button" onClick={reset} className={buttonClasses.brand}>
        Try again
      </button>
    </div>
  );
}

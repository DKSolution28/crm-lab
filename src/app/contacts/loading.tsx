export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4" role="status" aria-live="polite" aria-label="Loading contacts">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SessionMenu({ name }: { name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <span>{name}</span>
      <button type="button" onClick={signOut} disabled={pending} className="h-8 rounded border border-slate-300 bg-white px-2 text-slate-900">
        Sign out
      </button>
    </div>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Met à jour les paramètres d'URL de la liste (état de navigation partageable). */
export function useListUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | null | undefined>, options: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      if (options.replace) router.replace(url);
      else router.push(url);
    },
    [router, pathname, searchParams],
  );

  const refresh = useCallback(() => router.refresh(), [router]);

  return { update, refresh, searchParams };
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchUser } from "@/app/actions";

type UserOption = { id: string; alias: string; firstName: string; lastName: string; role: "ADMIN" | "STANDARD" };

// Sélecteur d'utilisateur de démonstration (conçu) : porte le propriétaire et les autorisations.
export function UserSwitcher({ users, currentId }: { users: UserOption[]; currentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="hidden sm:inline">View profile</span>
      <select
        aria-label="Current demo user"
        value={currentId}
        disabled={pending}
        onChange={(event) =>
          startTransition(async () => {
            await switchUser(event.target.value);
            router.refresh();
          })
        }
        className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName} ({user.role === "ADMIN" ? "admin" : "standard"})
          </option>
        ))}
      </select>
    </label>
  );
}

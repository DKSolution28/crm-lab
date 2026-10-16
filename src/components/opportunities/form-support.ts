import type { CurrentUser } from "@/lib/auth/current-user";
import { fullName, listUsers } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/policies";

type OwnerLike = { id: string; firstName: string; lastName: string; alias: string };

export const ownerOptions = async (user: CurrentUser, owner: OwnerLike | null) => {
  const current = owner ? `${fullName(owner)} (${owner.alias})` : `${fullName(user)} (${user.alias})`;
  if (!isAdmin(user)) return { label: current, options: null };
  const users = await listUsers();
  return { label: current, options: users.map((candidate) => ({ id: candidate.id, label: `${fullName(candidate)} (${candidate.alias})` })) };
};

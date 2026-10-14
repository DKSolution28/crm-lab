import type { CurrentUser } from "@/lib/auth/current-user";
import { fullName, listUsers } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/policies";
import type { LeadDto } from "@/lib/leads/service";

export const initialLeadValues = (lead: LeadDto | null, user: CurrentUser): Record<string, string> => ({
  firstName: lead?.firstName ?? "",
  lastName: lead?.lastName ?? "",
  company: lead?.company ?? "",
  title: lead?.title ?? "",
  email: lead?.email ?? "",
  phone: lead?.phone ?? "",
  description: lead?.description ?? "",
  status: lead && lead.status !== "Converted" ? lead.status : "New",
  qualified: lead?.qualified ? "true" : "false",
  ownerId: lead?.ownerId ?? user.id,
});

/** Un administrateur peut réassigner le propriétaire. Les autres voient le propriétaire en lecture seule. */
export const leadOwnerOptions = async (user: CurrentUser, lead: LeadDto | null) => {
  const current = lead ? `${fullName(lead.owner)} (${lead.owner.alias})` : `${fullName(user)} (${user.alias})`;
  if (!isAdmin(user)) return { label: current, options: null };
  const users = await listUsers();
  return { label: current, options: users.map((person) => ({ id: person.id, label: `${fullName(person)} (${person.alias})` })) };
};

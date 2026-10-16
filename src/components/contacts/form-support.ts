import type { CurrentUser } from "@/lib/auth/current-user";
import { fullName, listUsers } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/policies";
import { COUNTRY_OPTIONS } from "@/lib/accounts/picklists";
import type { ContactDetail } from "@/lib/contacts/service";
import { SALUTATIONS } from "@/lib/contacts/validation";
import type { ContactFormProps } from "./contact-form";

const TEXT_KEYS = [
  "salutation",
  "firstName",
  "lastName",
  "title",
  "description",
  "phone",
  "email",
  "mailingStreet",
  "mailingCity",
  "mailingStateCode",
  "mailingPostalCode",
  "mailingCountryCode",
] as const;

export const initialValuesFrom = (contact: ContactDetail | null, user: CurrentUser): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const key of TEXT_KEYS) {
    const raw = contact ? contact[key] : null;
    values[key] = raw === null || raw === undefined ? "" : String(raw);
  }
  values.ownerId = contact?.ownerId ?? user.id;
  values.accountId = contact?.accountId ?? "";
  values.reportsToId = contact?.reportsToId ?? "";
  return values;
};

export const formCountries = () => COUNTRY_OPTIONS;

export const formSalutations = () => SALUTATIONS;

export const ownerOptions = async (user: CurrentUser, contact: ContactDetail | null): Promise<ContactFormProps["owner"]> => {
  const current = contact ? `${fullName(contact.owner)} (${contact.owner.alias})` : `${fullName(user)} (${user.alias})`;
  if (!isAdmin(user)) return { label: current, options: null };
  const users = await listUsers();
  return { label: current, options: users.map((item) => ({ id: item.id, label: `${fullName(item)} (${item.alias})` })) };
};

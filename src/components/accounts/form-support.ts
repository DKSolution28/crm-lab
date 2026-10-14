// Préparation des props du formulaire Account côté serveur.
import type { CurrentUser } from "@/lib/auth/current-user";
import { fullName, listUsers } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/policies";
import { COUNTRY_OPTIONS, PICKLISTS } from "@/lib/accounts/picklists";
import type { AccountDto } from "@/lib/accounts/service";
import type { AccountFormProps } from "./account-form";

const TEXT_KEYS = [
  "name",
  "accountNumber",
  "site",
  "accountSource",
  "annualRevenue",
  "type",
  "industry",
  "ownership",
  "rating",
  "description",
  "website",
  "tickerSymbol",
  "sic",
  "sicDesc",
  "jigsaw",
  "tier",
  "numberOfEmployees",
  "phone",
  "fax",
  "billingStreet",
  "billingCity",
  "billingStateCode",
  "billingPostalCode",
  "billingCountryCode",
  "shippingStreet",
  "shippingCity",
  "shippingStateCode",
  "shippingPostalCode",
  "shippingCountryCode",
] as const;

export const initialValuesFrom = (account: AccountDto | null, user: CurrentUser): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const key of TEXT_KEYS) {
    const raw = account ? account[key] : null;
    values[key] = raw === null || raw === undefined ? "" : String(raw);
  }
  values.isBuyer = account?.isBuyer ? "true" : "false";
  values.isCustomerPortal = account?.isCustomerPortal ? "true" : "false";
  values.ownerId = account?.ownerId ?? user.id;
  values.parentId = account?.parentId ?? "";
  return values;
};

export const formPicklists = (): AccountFormProps["picklists"] => ({
  type: PICKLISTS.type,
  industry: PICKLISTS.industry,
  rating: PICKLISTS.rating,
  accountSource: PICKLISTS.accountSource,
  ownership: PICKLISTS.ownership,
});

export const formCountries = () => COUNTRY_OPTIONS;

/** Observé : Account Owner en lecture seule pour l'utilisateur courant ; conçu : un administrateur peut réassigner. */
export const ownerOptions = async (user: CurrentUser, account: AccountDto | null): Promise<AccountFormProps["owner"]> => {
  const current = account ? `${fullName(account.owner)} (${account.owner.alias})` : `${fullName(user)} (${user.alias})`;
  if (!isAdmin(user)) return { label: current, options: null };
  const users = await listUsers();
  return { label: current, options: users.map((u) => ({ id: u.id, label: `${fullName(u)} (${u.alias})` })) };
};

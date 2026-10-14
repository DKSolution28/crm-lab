// Formatage d'affichage des valeurs Account (colonnes de liste et fiche).
import { getField } from "./fields";
import { countryLabel, picklistLabel, stateLabel } from "./picklists";
import type { AccountDto } from "./service";

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const dateOnly = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US");

export const formatCurrency = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "" : currency.format(Number(value));

export const formatNumber = (value: number | null | undefined) => (value === null || value === undefined ? "" : number.format(value));

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : "");
export const formatDate = (iso: string | null | undefined) => (iso ? dateOnly.format(new Date(iso)) : "");

export const formatAddress = (account: AccountDto, prefix: "billing" | "shipping"): string => {
  const parts = [
    account[`${prefix}Street`],
    [account[`${prefix}City`], account[`${prefix}State`], account[`${prefix}PostalCode`]].filter(Boolean).join(", "),
    account[`${prefix}Country`],
  ].filter((part) => part && String(part).trim());
  return parts.join("\n");
};

export const formatFieldValue = (account: AccountDto, key: string): string => {
  const field = getField(key);
  if (!field) return "";
  switch (key) {
    case "ownerAlias":
      return account.owner.alias;
    case "ownerFirstName":
      return account.owner.firstName;
    case "ownerLastName":
      return account.owner.lastName;
    case "createdByAlias":
      return account.createdBy.alias;
    case "lastModifiedByAlias":
      return account.lastModifiedBy.alias;
    case "parentName":
      return account.parent?.name ?? "";
    case "billingStateCode":
      return stateLabel(account.billingCountryCode, account.billingStateCode);
    case "shippingStateCode":
      return stateLabel(account.shippingCountryCode, account.shippingStateCode);
    case "billingCountryCode":
      return countryLabel(account.billingCountryCode);
    case "shippingCountryCode":
      return countryLabel(account.shippingCountryCode);
    default:
      break;
  }
  const raw = (account as unknown as Record<string, unknown>)[field.path];
  if (raw === null || raw === undefined) return "";
  switch (field.kind) {
    case "picklist":
      return field.picklist ? picklistLabel(field.picklist, String(raw)) : String(raw);
    case "boolean":
      return raw ? "Yes" : "No";
    case "currency":
      return formatCurrency(raw as string);
    case "number":
      return formatNumber(raw as number);
    case "datetime":
      return formatDateTime(raw as string);
    case "date":
      return formatDate(raw as string);
    default:
      return String(raw);
  }
};

import Link from "next/link";
import { formatAddress, formatDateTime, formatFieldValue } from "@/lib/accounts/format";
import { getField } from "@/lib/accounts/fields";
import type { AccountDto } from "@/lib/accounts/service";

type Row = { label: string; value: string; href?: string; multiline?: boolean };

const field = (account: AccountDto, key: string): Row => ({ label: getField(key)!.label, value: formatFieldValue(account, key) });

// Sections du layout « Account Layout » observé dans Setup : About, Get in Touch,
// History. La répartition des champs hors formulaire New est déduite.
export const detailSections = (account: AccountDto) => [
  {
    title: "About",
    rows: [
      field(account, "name"),
      field(account, "accountNumber"),
      field(account, "type"),
      field(account, "industry"),
      { label: "Website", value: account.website ?? "", href: account.website ?? undefined },
      field(account, "rating"),
      field(account, "accountSource"),
      field(account, "ownership"),
      field(account, "annualRevenue"),
      field(account, "numberOfEmployees"),
      field(account, "tickerSymbol"),
      field(account, "sic"),
      field(account, "sicDesc"),
      field(account, "jigsaw"),
      field(account, "tier"),
      field(account, "isBuyer"),
      field(account, "isCustomerPortal"),
      field(account, "site"),
      { label: "Parent Account", value: account.parent?.name ?? "", href: account.parent ? `/accounts/${account.parent.id}` : undefined },
      { label: "Account Owner", value: `${account.owner.firstName} ${account.owner.lastName} (${account.owner.alias})` },
      { label: "Description", value: account.description ?? "", multiline: true },
    ] satisfies Row[],
  },
  {
    title: "Get in Touch",
    rows: [
      field(account, "phone"),
      field(account, "fax"),
      { label: "Billing Address", value: formatAddress(account, "billing"), multiline: true },
      { label: "Shipping Address", value: formatAddress(account, "shipping"), multiline: true },
    ] satisfies Row[],
  },
  {
    title: "History",
    rows: [
      { label: "Created By", value: `${account.createdBy.alias}, ${formatDateTime(account.createdAt)}` },
      { label: "Last Modified By", value: `${account.lastModifiedBy.alias}, ${formatDateTime(account.updatedAt)}` },
      field(account, "lastActivityDate"),
    ] satisfies Row[],
  },
];

export function AccountDetails({ account, compact = false }: { account: AccountDto; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {detailSections(account).map((section) => (
        <section key={section.title} aria-labelledby={`section-${section.title.replace(/\s+/g, "-")}`}>
          <h3 id={`section-${section.title.replace(/\s+/g, "-")}`} className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-800">
            {section.title}
          </h3>
          <dl className={`grid gap-x-8 gap-y-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {section.rows.map((row) => (
              <div key={row.label} className="border-b border-slate-100 pb-1">
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className={`min-h-5 text-sm text-slate-900 ${row.multiline ? "whitespace-pre-line" : "truncate"}`}>
                  {row.href && row.value ? (
                    row.href.startsWith("/") ? (
                      <Link href={row.href} className="text-blue-700 hover:underline">
                        {row.value}
                      </Link>
                    ) : (
                      <a href={row.href} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                        {row.value}
                      </a>
                    )
                  ) : (
                    row.value || <span className="text-slate-300">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

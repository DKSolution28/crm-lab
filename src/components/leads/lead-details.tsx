import Link from "next/link";
import type { LeadDto } from "@/lib/leads/service";

const formatDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) : "";

const Row = ({ label, value, testId }: { label: string; value: string; testId?: string }) => (
  <div className="min-w-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="truncate text-sm text-slate-900" data-testid={testId}>
      {value || <span className="text-slate-300">—</span>}
    </dd>
  </div>
);

export function LeadDetails({ lead }: { lead: LeadDto }) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="lead-about">
        <h2 id="lead-about" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          About
        </h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Row label="First Name" value={lead.firstName ?? ""} />
          <Row label="Last Name" value={lead.lastName} />
          <Row label="Company" value={lead.company} testId="lead-company" />
          <Row label="Title" value={lead.title ?? ""} />
          <Row label="Status" value={lead.status} testId="lead-status" />
          <Row label="Qualified" value={lead.qualified ? "Yes" : "No"} testId="lead-qualified" />
          <div className="md:col-span-2">
            <dt className="text-xs text-slate-500">Description</dt>
            <dd className="whitespace-pre-wrap text-sm text-slate-900">{lead.description || <span className="text-slate-300">—</span>}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="lead-contact">
        <h2 id="lead-contact" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          Get in Touch
        </h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Row label="Email" value={lead.email ?? ""} />
          <Row label="Phone" value={lead.phone ?? ""} />
        </dl>
      </section>

      <section aria-labelledby="lead-history">
        <h2 id="lead-history" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          History
        </h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Row label="Lead Owner" value={`${lead.owner.firstName} ${lead.owner.lastName} (${lead.owner.alias})`} />
          <Row label="Created By" value={`${lead.createdBy.firstName} ${lead.createdBy.lastName}`} />
          <Row label="Created Date" value={formatDateTime(lead.createdAt)} />
          <Row label="Last Modified By" value={`${lead.lastModifiedBy.firstName} ${lead.lastModifiedBy.lastName}`} />
          <Row label="Last Modified Date" value={formatDateTime(lead.updatedAt)} />
        </dl>
      </section>

      {lead.conversion ? (
        <section aria-labelledby="lead-converted-title">
          <h2 id="lead-converted-title" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
            Converted record
          </h2>
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Row label="Converted at" value={formatDateTime(lead.conversion.convertedAt)} />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Account</dt>
              <dd className="truncate text-sm text-slate-900">
                {lead.conversion.accountId ? (
                  <Link href={`/accounts/${lead.conversion.accountId}`} data-testid="converted-account" className="text-blue-700 hover:underline">
                    View account
                  </Link>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Contact</dt>
              <dd className="truncate text-sm text-slate-900">
                {lead.conversion.contactId ? (
                  <Link href={`/contacts/${lead.conversion.contactId}`} data-testid="converted-contact" className="text-blue-700 hover:underline">
                    View contact
                  </Link>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Opportunity</dt>
              <dd className="truncate text-sm text-slate-900">
                {lead.conversion.opportunityId ? (
                  <Link href={`/opportunities/${lead.conversion.opportunityId}`} data-testid="converted-opportunity" className="text-blue-700 hover:underline">
                    View opportunity
                  </Link>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RelatedTasks } from "@/components/activities/related-tasks";
import { ConvertPanel } from "@/components/leads/convert-panel";
import { LeadDetails } from "@/components/leads/lead-details";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { leadDisplayName } from "@/lib/leads/format";
import { getLead } from "@/lib/leads/service";
import { recordRecentView } from "@/lib/recent/service";
import { convertLeadAction } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const lead = await getLead(id);
  return { title: lead ? `${leadDisplayName(lead)} | Lead | CRM Lab` : "Lead | CRM Lab" };
}

export default async function LeadRecordPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const lead = await getLead(id);
  if (!lead) notFound();
  await recordRecentView("Lead", lead.id, user);
  const toast = parseToast(query.toast);
  const name = leadDisplayName(lead);
  const editable = canEditRecord(user, lead) && lead.conversion === null;
  const convertible = editable && lead.qualified && (lead.status === "New" || lead.status === "Working");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-4">
      {toast ? <ToastFromQuery key={`${toast.kind}:${toast.message}`} kind={toast.kind} message={toast.message} /> : null}
      <header className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded bg-[#7f8de1] text-xl text-white">
              +
            </span>
            <div>
              <p className="text-xs text-slate-500">Lead</p>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="lead-name">
                {name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leads" className={buttonClasses.neutral}>
              Back to list
            </Link>
            {convertible ? <ConvertPanel action={convertLeadAction.bind(null, lead.id)} company={lead.company} /> : null}
            {editable ? (
              <Link href={`/leads/${lead.id}/edit`} className={buttonClasses.neutral}>
                Edit
              </Link>
            ) : lead.conversion ? (
              <span className="text-sm text-slate-600">This lead is converted and can no longer be edited.</span>
            ) : (
              <span className={`${buttonClasses.neutral} cursor-not-allowed opacity-60`} title="You can only edit leads you own." aria-disabled="true">
                Edit
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <LeadDetails lead={lead} />
      </div>
      <RelatedTasks parentType="Lead" parentId={lead.id} />
    </div>
  );
}

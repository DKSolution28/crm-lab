import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RelatedTasks } from "@/components/activities/related-tasks";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { formatOpportunityAmount } from "@/lib/opportunities/format";
import { getOpportunity } from "@/lib/opportunities/service";
import { recordRecentView } from "@/lib/recent/service";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  return { title: opportunity ? `${opportunity.name} | Opportunity | CRM Lab` : "Opportunity | CRM Lab" };
}

export default async function OpportunityRecordPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();
  await recordRecentView("Opportunity", opportunity.id, user);
  const toast = parseToast(query.toast);
  const editable = canEditRecord(user, opportunity);
  const contactName = opportunity.primaryContact ? [opportunity.primaryContact.firstName, opportunity.primaryContact.lastName].filter(Boolean).join(" ") : "";

  const fields = [
    { label: "Account", value: opportunity.account?.name ?? "", href: opportunity.account ? `/accounts/${opportunity.account.id}` : undefined },
    { label: "Stage", value: opportunity.stageName, testId: "opportunity-stage" },
    { label: "Amount", value: formatOpportunityAmount(opportunity.amount), testId: "opportunity-amount" },
    { label: "Close Date", value: opportunity.closeDate, testId: "opportunity-close-date" },
    { label: "Probability", value: opportunity.probability === null ? "" : String(opportunity.probability) },
    { label: "Primary Contact", value: contactName },
    { label: "Opportunity Owner", value: `${opportunity.owner.firstName} ${opportunity.owner.lastName}` },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-4">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded bg-[#e07a3d] text-xl text-white">
              ◔
            </span>
            <div>
              <p className="text-xs text-slate-500">Opportunity</p>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="opportunity-name">
                {opportunity.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/opportunities" className={buttonClasses.neutral}>
              Back to list
            </Link>
            {editable ? (
              <Link href={`/opportunities/${opportunity.id}/edit`} className={buttonClasses.neutral}>
                Edit
              </Link>
            ) : (
              <span className={`${buttonClasses.neutral} cursor-not-allowed opacity-60`} title="You can only edit opportunities you own." aria-disabled="true">
                Edit
              </span>
            )}
          </div>
        </div>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">About</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="text-sm text-slate-900" data-testid={field.testId}>
                {field.href && field.value ? (
                  <Link href={field.href} className="text-blue-700 hover:underline">
                    {field.value}
                  </Link>
                ) : (
                  field.value || <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <RelatedTasks parentType="Opportunity" parentId={opportunity.id} />
    </div>
  );
}

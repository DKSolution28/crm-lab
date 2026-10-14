import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ownerOptions } from "@/components/opportunities/form-support";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { buttonClasses } from "@/components/ui/modal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { getOpportunity } from "@/lib/opportunities/service";
import { OPPORTUNITY_STAGES } from "@/lib/opportunities/validation";
import { updateOpportunityAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  return { title: opportunity ? `Edit ${opportunity.name} | CRM Lab` : "Edit Opportunity | CRM Lab" };
}

export default async function EditOpportunityPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  if (!canEditRecord(user, opportunity)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">You can only edit opportunities you own.</h1>
        <p className="text-sm text-slate-600">
          This opportunity is owned by {opportunity.owner.firstName} {opportunity.owner.lastName}. Switch to its owner or an administrator to edit it.
        </p>
        <Link href={`/opportunities/${opportunity.id}`} className={buttonClasses.neutral}>
          Back to the opportunity
        </Link>
      </div>
    );
  }

  const action = updateOpportunityAction.bind(null, opportunity.id);
  const owner = await ownerOptions(user, opportunity.owner);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-opportunity-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href={`/opportunities/${opportunity.id}`} aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="edit-opportunity-title" className="text-xl font-semibold text-slate-900">
            Edit {opportunity.name}
          </h1>
        </header>
        <div className="px-6 py-4">
          <OpportunityForm
            mode="edit"
            action={action}
            stages={OPPORTUNITY_STAGES}
            initial={{
              name: opportunity.name,
              stageName: opportunity.stageName,
              amount: opportunity.amount ?? "",
              closeDate: opportunity.closeDate,
              probability: opportunity.probability === null ? "" : String(opportunity.probability),
              accountId: opportunity.accountId ?? "",
              primaryContactId: opportunity.primaryContactId ?? "",
              ownerId: opportunity.ownerId,
            }}
            account={opportunity.account}
            contact={opportunity.primaryContact}
            owner={owner}
          />
        </div>
      </section>
    </div>
  );
}

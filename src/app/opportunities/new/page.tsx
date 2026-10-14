import Link from "next/link";
import type { Metadata } from "next";
import { ownerOptions } from "@/components/opportunities/form-support";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { OPPORTUNITY_STAGES } from "@/lib/opportunities/validation";
import { createOpportunityAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Opportunity | CRM Lab" };

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const toast = parseToast(params.toast);
  const owner = await ownerOptions(user, null);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <section role="dialog" aria-modal="true" aria-labelledby="new-opportunity-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href="/opportunities" aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="new-opportunity-title" className="text-xl font-semibold text-slate-900">
            New Opportunity
          </h1>
        </header>
        <div className="px-6 py-4">
          <OpportunityForm
            mode="new"
            action={createOpportunityAction}
            stages={OPPORTUNITY_STAGES}
            initial={{ name: "", stageName: "Qualification", amount: "", closeDate: "", probability: "", accountId: "", primaryContactId: "", ownerId: user.id }}
            account={null}
            contact={null}
            owner={owner}
          />
        </div>
      </section>
    </div>
  );
}

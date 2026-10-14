import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";
import { initialLeadValues, leadOwnerOptions } from "@/components/leads/form-support";
import { buttonClasses } from "@/components/ui/modal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { leadDisplayName } from "@/lib/leads/format";
import { getLead } from "@/lib/leads/service";
import { updateLeadAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const lead = await getLead(id);
  return { title: lead ? `Edit ${leadDisplayName(lead)} | CRM Lab` : "Edit Lead | CRM Lab" };
}

export default async function EditLeadPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const lead = await getLead(id);
  if (!lead) notFound();
  const name = leadDisplayName(lead);

  if (lead.conversion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">This lead is already converted.</h1>
        <p className="text-sm text-slate-600">Converted leads stay as they are. The edit form is not available.</p>
        <Link href={`/leads/${lead.id}`} className={buttonClasses.neutral}>
          Back to the lead
        </Link>
      </div>
    );
  }

  if (!canEditRecord(user, lead)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">You can only edit leads you own.</h1>
        <p className="text-sm text-slate-600">
          This lead is owned by {lead.owner.firstName} {lead.owner.lastName}. Switch to its owner or an administrator to edit it.
        </p>
        <Link href={`/leads/${lead.id}`} className={buttonClasses.neutral}>
          Back to the lead
        </Link>
      </div>
    );
  }

  const action = updateLeadAction.bind(null, lead.id);
  const owner = await leadOwnerOptions(user, lead);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-lead-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href={`/leads/${lead.id}`} aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="edit-lead-title" className="text-xl font-semibold text-slate-900">
            Edit {name}
          </h1>
        </header>
        <div className="px-6 py-4">
          <LeadForm mode="edit" action={action} initial={initialLeadValues(lead, user)} owner={owner} />
        </div>
      </section>
    </div>
  );
}

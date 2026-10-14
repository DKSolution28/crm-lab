import Link from "next/link";
import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";
import { initialLeadValues, leadOwnerOptions } from "@/components/leads/form-support";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createLeadAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Lead | CRM Lab" };

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const toast = parseToast(params.toast);
  const owner = await leadOwnerOptions(user, null);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <section role="dialog" aria-modal="true" aria-labelledby="new-lead-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href="/leads" aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="new-lead-title" className="text-xl font-semibold text-slate-900">
            New Lead
          </h1>
        </header>
        <div className="px-6 py-4">
          <LeadForm mode="new" action={createLeadAction} initial={initialLeadValues(null, user)} owner={owner} />
        </div>
      </section>
    </div>
  );
}

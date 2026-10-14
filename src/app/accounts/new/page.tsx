import Link from "next/link";
import type { Metadata } from "next";
import { AccountForm } from "@/components/accounts/account-form";
import { formCountries, formPicklists, initialValuesFrom, ownerOptions } from "@/components/accounts/form-support";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAccountAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Account | CRM Lab" };

// FRM-1 (observé) : modale « New Account » ouverte au-dessus de la liste ;
// CRM Lab la rend comme une page dédiée avec une présentation de dialogue
// (conçu) pour rester accessible par URL et testable.
export default async function NewAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const toast = parseToast(params.toast);
  const owner = await ownerOptions(user, null);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <section role="dialog" aria-modal="true" aria-labelledby="new-account-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href="/accounts" aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="new-account-title" className="text-xl font-semibold text-slate-900">
            New Account
          </h1>
        </header>
        <div className="px-6 py-4">
          <AccountForm mode="new" action={createAccountAction} initial={initialValuesFrom(null, user)} parent={null} picklists={formPicklists()} countries={formCountries()} owner={owner} />
        </div>
      </section>
    </div>
  );
}

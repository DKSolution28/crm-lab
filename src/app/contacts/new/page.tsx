import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contacts/contact-form";
import { formCountries, formSalutations, initialValuesFrom, ownerOptions } from "@/components/contacts/form-support";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createContactAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Contact | CRM Lab" };

export default async function NewContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const toast = parseToast(params.toast);
  const owner = await ownerOptions(user, null);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <section role="dialog" aria-modal="true" aria-labelledby="new-contact-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href="/contacts" aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="new-contact-title" className="text-xl font-semibold text-slate-900">
            New Contact
          </h1>
        </header>
        <div className="px-6 py-4">
          <ContactForm
            mode="new"
            action={createContactAction}
            initial={initialValuesFrom(null, user)}
            cancelHref="/contacts"
            account={null}
            reportsTo={null}
            salutations={formSalutations()}
            countries={formCountries()}
            owner={owner}
          />
        </div>
      </section>
    </div>
  );
}

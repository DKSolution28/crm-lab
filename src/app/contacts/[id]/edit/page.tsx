import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contacts/contact-form";
import { formCountries, formSalutations, initialValuesFrom, ownerOptions } from "@/components/contacts/form-support";
import { buttonClasses } from "@/components/ui/modal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { contactName } from "@/lib/contacts/format";
import { getContact } from "@/lib/contacts/service";
import { updateContactAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const contact = await getContact(id);
  return { title: contact ? `Edit ${contactName(contact)} | CRM Lab` : "Edit Contact | CRM Lab" };
}

export default async function EditContactPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const contact = await getContact(id);
  if (!contact) notFound();
  const name = contactName(contact);

  if (!canEditRecord(user, contact)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">You can only edit contacts you own.</h1>
        <p className="text-sm text-slate-600">
          This contact is owned by {contact.owner.firstName} {contact.owner.lastName}. Switch to its owner or an administrator to edit it.
        </p>
        <Link href={`/contacts/${contact.id}`} className={buttonClasses.neutral}>
          Back to the contact
        </Link>
      </div>
    );
  }

  const owner = await ownerOptions(user, contact);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-contact-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href={`/contacts/${contact.id}`} aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="edit-contact-title" className="text-xl font-semibold text-slate-900">
            Edit {name}
          </h1>
        </header>
        <div className="px-6 py-4">
          <ContactForm
            key={contact.id}
            mode="edit"
            action={updateContactAction.bind(null, contact.id)}
            initial={initialValuesFrom(contact, user)}
            cancelHref={`/contacts/${contact.id}`}
            contactId={contact.id}
            account={contact.account}
            reportsTo={contact.reportsTo}
            salutations={formSalutations()}
            countries={formCountries()}
            owner={owner}
          />
        </div>
      </section>
    </div>
  );
}

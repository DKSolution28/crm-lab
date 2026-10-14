import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RelatedTasks } from "@/components/activities/related-tasks";
import { buttonClasses } from "@/components/ui/modal";
import { ToastFromQuery } from "@/components/ui/toast";
import { parseToast } from "@/components/ui/toast-query";
import { formatDateTime } from "@/lib/accounts/format";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { contactName } from "@/lib/contacts/format";
import { getContact } from "@/lib/contacts/service";
import { recordRecentView } from "@/lib/recent/service";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const contact = await getContact(id);
  return { title: contact ? `${contactName(contact)} | Contact | CRM Lab` : "Contact | CRM Lab" };
}

const dash = (value: string | null | undefined) => value || <span className="text-slate-300">—</span>;

export default async function ContactRecordPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const contact = await getContact(id);
  if (!contact) notFound();
  await recordRecentView("Contact", contact.id, user);
  const toast = parseToast(query.toast);
  const editable = canEditRecord(user, contact);
  const name = contactName(contact);
  const mailing = [contact.mailingStreet, [contact.mailingCity, contact.mailingState, contact.mailingPostalCode].filter(Boolean).join(", "), contact.mailingCountry]
    .filter((part) => part && part.trim())
    .join("\n");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-4">
      {toast ? <ToastFromQuery kind={toast.kind} message={toast.message} /> : null}
      <header className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded bg-[#7f8de1] text-xl text-white">
              ☺
            </span>
            <div>
              <p className="text-xs text-slate-500">Contact</p>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="contact-name">
                {name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/contacts" className={buttonClasses.neutral}>
              Back to list
            </Link>
            {editable ? (
              <Link href={`/contacts/${contact.id}/edit`} className={buttonClasses.neutral}>
                Edit
              </Link>
            ) : (
              <span className={`${buttonClasses.neutral} cursor-not-allowed opacity-60`} title="You can only edit contacts you own." aria-disabled="true">
                Edit
              </span>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 md:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Account</dt>
            <dd className="truncate text-sm text-slate-900">
              {contact.account ? (
                <Link href={`/accounts/${contact.account.id}`} data-testid="contact-account" className="text-blue-700 hover:underline">
                  {contact.account.name}
                </Link>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Title</dt>
            <dd className="truncate text-sm text-slate-900">{dash(contact.title)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Phone</dt>
            <dd className="truncate text-sm text-slate-900">{dash(contact.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="truncate text-sm text-slate-900">{dash(contact.email)}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
        <section aria-labelledby="about-title">
          <h2 id="about-title" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
            About
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Name</dt>
              <dd>{[contact.salutation, name].filter(Boolean).join(" ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Reports To</dt>
              <dd>
                {contact.reportsTo ? (
                  <Link href={`/contacts/${contact.reportsTo.id}`} className="text-blue-700 hover:underline">
                    {contactName(contact.reportsTo)}
                  </Link>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Contact Owner</dt>
              <dd>
                {contact.owner.firstName} {contact.owner.lastName} ({contact.owner.alias})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Description</dt>
              <dd className="whitespace-pre-wrap">{dash(contact.description)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="touch-title">
          <h2 id="touch-title" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
            Get in Touch
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Mailing Address</dt>
              <dd className="whitespace-pre-wrap">{mailing || <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Created By</dt>
              <dd>
                {contact.createdBy.alias}, {formatDateTime(contact.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Last Modified By</dt>
              <dd>
                {contact.lastModifiedBy.alias}, {formatDateTime(contact.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="reports-title" className="md:col-span-2">
          <h2 id="reports-title" className="mb-2 text-sm font-semibold text-slate-800">
            Direct Reports ({contact.directReports.length})
          </h2>
          {contact.directReports.length === 0 ? (
            <p className="text-sm text-slate-500">No contacts report to this contact.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {contact.directReports.map((report) => (
                <li key={report.id}>
                  <Link href={`/contacts/${report.id}`} className="text-blue-700 hover:underline">
                    {contactName(report)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <RelatedTasks parentType="Contact" parentId={contact.id} />
    </div>
  );
}

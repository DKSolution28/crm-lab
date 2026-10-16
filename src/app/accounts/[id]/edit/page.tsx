import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AccountForm } from "@/components/accounts/account-form";
import { formCountries, formPicklists, initialValuesFrom, ownerOptions } from "@/components/accounts/form-support";
import { buttonClasses } from "@/components/ui/modal";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canEditAccount } from "@/lib/auth/policies";
import { getAccount } from "@/lib/accounts/service";
import { updateAccountAction } from "../../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const account = await getAccount(id);
  return { title: account ? `Edit ${account.name} | CRM Lab` : "Edit Account | CRM Lab" };
}

// Édition d'un compte : non observée dans Salesforce (aucun enregistrement).
// Conçu : même formulaire que la création (sections About / Get in Touch),
// bouton « Undo <champ> » déduit de FRM-2, autorisation propriétaire/admin.
export default async function EditAccountPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const account = await getAccount(id);
  if (!account) notFound();

  if (!canEditAccount(user, account)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-800">You can only edit accounts you own.</h1>
        <p className="text-sm text-slate-600">
          This account is owned by {account.owner.firstName} {account.owner.lastName}. Switch to its owner or an administrator to edit it.
        </p>
        <Link href={`/accounts/${account.id}`} className={buttonClasses.neutral}>
          Back to the account
        </Link>
      </div>
    );
  }

  const action = updateAccountAction.bind(null, account.id);
  const owner = await ownerOptions(user, account);

  return (
    <div className="flex flex-1 items-start justify-center bg-slate-900/40 px-4 py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-account-title" className="relative w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <Link href={`/accounts/${account.id}`} aria-label="Cancel and close" className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100">
          ×
        </Link>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h1 id="edit-account-title" className="text-xl font-semibold text-slate-900">
            Edit {account.name}
          </h1>
        </header>
        <div className="px-6 py-4">
          <AccountForm
            mode="edit"
            action={action}
            accountId={account.id}
            initial={initialValuesFrom(account, user)}
            parent={account.parent ? { id: account.parent.id, name: account.parent.name } : null}
            picklists={formPicklists()}
            countries={formCountries()}
            owner={owner}
          />
        </div>
      </section>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAccount, type CreateAccountState } from "./actions";

const initialState: CreateAccountState = {};

export function NewAccountForm() {
  const [state, formAction, pending] = useActionState(createAccount, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.createdId) formRef.current?.reset();
  }, [state.createdId]);

  const inputClass =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="new-account-form"
    >
      <h2 className="text-base font-semibold">Nouveau compte</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Nom *</span>
          <input name="name" required minLength={2} className={inputClass} placeholder="Acme Corp" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Secteur</span>
          <input name="industry" className={inputClass} placeholder="Technology" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">Ville</span>
          <input name="billingCity" className={inputClass} placeholder="Paris" />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer le compte"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.createdId && !pending && (
          <p role="status" className="text-sm text-emerald-600" data-testid="create-success">
            Compte créé.
          </p>
        )}
      </div>
    </form>
  );
}

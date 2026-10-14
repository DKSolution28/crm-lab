"use client";

import { useActionState, useState } from "react";
import type { LeadFormState } from "@/app/leads/actions";
import { Modal, buttonClasses, inputClasses } from "@/components/ui/modal";

const STAGES = ["Qualification", "Proposal", "Negotiation"] as const;

type ConvertAction = (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <span role="alert" className="text-xs text-red-700">
      {message}
    </span>
  ) : null;

export function ConvertPanel({ action, company }: { action: ConvertAction; company: string }) {
  const [open, setOpen] = useState(false);
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [state, formAction, pending] = useActionState(action, { ok: true } as LeadFormState);
  const errorFor = (key: string) => state.fieldErrors?.[key];

  return (
    <>
      <button type="button" className={buttonClasses.brand} data-testid="convert-lead" onClick={() => setOpen(true)}>
        Convert
      </button>
      {open ? (
        <Modal title="Convert lead" onClose={() => setOpen(false)} closeOnEscape={!pending}>
          <form action={formAction} className="flex flex-col gap-4" noValidate>
            {state.error ? (
              <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {state.error}
              </p>
            ) : null}
            <FieldError message={errorFor("qualified")} />
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor="convert-account-name">
                <abbr title="required" className="mr-0.5 text-red-600 no-underline">
                  *
                </abbr>
                Account Name
              </label>
              <input
                id="convert-account-name"
                name="accountName"
                defaultValue={company}
                maxLength={255}
                aria-invalid={!!errorFor("accountName")}
                className={`${inputClasses} ${errorFor("accountName") ? "border-red-600" : ""}`}
              />
              <FieldError message={errorFor("accountName")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="createOpportunity" value="true" checked={createOpportunity} onChange={(event) => setCreateOpportunity(event.target.checked)} />
              Create opportunity
            </label>
            {createOpportunity ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1 text-sm md:col-span-2">
                  <label htmlFor="convert-opportunity-name">Opportunity Name</label>
                  <input id="convert-opportunity-name" name="opportunityName" defaultValue={`${company} — Opportunity`} maxLength={120} className={inputClasses} />
                  <FieldError message={errorFor("opportunity.name")} />
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <label htmlFor="convert-amount">Amount</label>
                  <input id="convert-amount" name="amount" inputMode="decimal" autoComplete="off" className={inputClasses} />
                  <FieldError message={errorFor("opportunity.amount")} />
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <label htmlFor="convert-close-date">
                    <abbr title="required" className="mr-0.5 text-red-600 no-underline">
                      *
                    </abbr>
                    Close Date
                  </label>
                  <input id="convert-close-date" name="closeDate" type="date" className={inputClasses} aria-invalid={!!errorFor("opportunity.closeDate")} />
                  <FieldError message={errorFor("opportunity.closeDate")} />
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <label htmlFor="convert-stage">Stage</label>
                  <select id="convert-stage" name="stage" defaultValue="Qualification" className={inputClasses}>
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errorFor("opportunity.stage")} />
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonClasses.neutral} onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </button>
              <button type="submit" className={buttonClasses.brand} disabled={pending}>
                {pending ? "Converting…" : "Convert lead"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

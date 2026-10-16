"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type ReactNode } from "react";
import type { OpportunityFormState } from "@/app/opportunities/actions";
import { buttonClasses, inputClasses } from "@/components/ui/modal";
import type { OpportunityStage } from "@prisma/client";
import { AccountLookup } from "./account-lookup";
import { ContactLookup } from "./contact-lookup";

const REQUIRED = "Complete this field.";

export type OpportunityFormProps = {
  mode: "new" | "edit";
  action: (state: OpportunityFormState, formData: FormData) => Promise<OpportunityFormState>;
  initial: Record<string, string>;
  stages: readonly OpportunityStage[];
  account: { id: string; name: string } | null;
  contact: { id: string; firstName: string | null; lastName: string } | null;
  owner: { label: string; options: { id: string; label: string }[] | null };
};

export function OpportunityForm(props: OpportunityFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(props.action, { ok: true } as OpportunityFormState);
  const [values, setValues] = useState<Record<string, string>>(state.values ?? props.initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const serverError = (key: string) => state.fieldErrors?.[key];
  const clientError = (key: string) => {
    if (!touched[key]) return undefined;
    if ((key === "name" || key === "closeDate" || key === "accountId") && !(values[key] ?? "").trim()) return REQUIRED;
    return undefined;
  };
  const errorFor = (key: string) => clientError(key) ?? serverError(key);
  const changed = (key: string) => (values[key] ?? "") !== (props.initial[key] ?? "");

  const cancel = () => {
    if (window.history.length > 1) router.back();
    else router.push("/opportunities");
  };

  const field = (name: string, label: string, control: ReactNode, options: { required?: boolean } = {}) => {
    const error = errorFor(name);
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <label htmlFor={`field-${name}`}>
            {options.required ? (
              <abbr title="required" className="mr-0.5 text-red-600 no-underline">
                *
              </abbr>
            ) : null}
            {label}
          </label>
          {changed(name) ? (
            <button type="button" onClick={() => set(name, props.initial[name] ?? "")} className="text-xs text-blue-700 hover:underline" aria-label={`Undo ${label}`}>
              Undo
            </button>
          ) : null}
        </div>
        {control}
        {error ? (
          <span id={`error-${name}`} role="alert" className="text-xs text-red-700">
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  const text = (name: string, options: { maxLength?: number; type?: string } = {}) => (
    <input
      id={`field-${name}`}
      name={name}
      type={options.type ?? "text"}
      maxLength={options.maxLength}
      value={values[name] ?? ""}
      onChange={(event) => set(name, event.target.value)}
      onBlur={() => setTouched((current) => ({ ...current, [name]: true }))}
      aria-invalid={!!errorFor(name)}
      aria-describedby={errorFor(name) ? `error-${name}` : undefined}
      className={`${inputClasses} ${errorFor(name) ? "border-red-600" : ""}`}
    />
  );

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const missingName = !String(data.get("name") ?? "").trim();
        const missingDate = !String(data.get("closeDate") ?? "").trim();
        const missingAccount = !String(data.get("accountId") ?? "").trim();
        if (missingName || missingDate || missingAccount) {
          event.preventDefault();
          setTouched((current) => ({ ...current, name: true, closeDate: true, accountId: true }));
          if (missingName) document.getElementById("field-name")?.focus();
          else if (missingAccount) document.getElementById("account-lookup")?.focus();
          else document.getElementById("field-closeDate")?.focus();
        }
      }}
      className="flex flex-col gap-6"
    >
      {state.error ? (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <p className="text-xs text-slate-500">* = Required Information</p>
      <section aria-labelledby="form-about">
        <h3 id="form-about" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          About
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {field("name", "Opportunity Name", text("name", { maxLength: 120 }), { required: true })}
          <AccountLookup
            initial={props.account}
            error={errorFor("accountId")}
            onChange={(id) => {
              set("accountId", id);
              setTouched((current) => ({ ...current, accountId: true }));
            }}
          />
          {field(
            "stageName",
            "Stage",
            <select id="field-stageName" name="stageName" value={values.stageName ?? "Qualification"} onChange={(event) => set("stageName", event.target.value)} className={inputClasses}>
              {props.stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>,
            { required: true },
          )}
          {field("amount", "Amount", text("amount"))}
          {field("closeDate", "Close Date", text("closeDate", { type: "date" }), { required: true })}
          {field("probability", "Probability", text("probability"))}
          <ContactLookup initial={props.contact} error={serverError("primaryContactId")} />
          {field(
            "ownerId",
            "Opportunity Owner",
            props.owner.options ? (
              <select id="field-ownerId" name="ownerId" value={values.ownerId ?? ""} onChange={(event) => set("ownerId", event.target.value)} className={inputClasses}>
                {props.owner.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="ownerId" value={values.ownerId ?? ""} />
                <p id="field-ownerId" className="flex h-8 items-center rounded border border-slate-200 bg-slate-50 px-2 text-slate-700">
                  {props.owner.label}
                </p>
              </>
            ),
          )}
        </div>
      </section>
      <footer className="sticky bottom-0 flex justify-center gap-2 border-t border-slate-200 bg-white py-3">
        <button type="button" onClick={cancel} className={buttonClasses.neutral}>
          Cancel
        </button>
        {props.mode === "new" ? (
          <button type="submit" name="intent" value="save-new" disabled={pending} className={buttonClasses.neutral}>
            Save &amp; New
          </button>
        ) : null}
        <button type="submit" name="intent" value="save" disabled={pending} className={buttonClasses.brand}>
          {pending ? "Saving…" : "Save"}
        </button>
      </footer>
    </form>
  );
}

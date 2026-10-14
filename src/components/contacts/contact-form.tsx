"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import type { ContactFormState } from "@/app/contacts/actions";
import { buttonClasses, inputClasses } from "@/components/ui/modal";
import type { CountryOption } from "@/lib/accounts/picklists";
import { AccountLookup } from "./account-lookup";
import { ReportsToLookup } from "./reports-to-lookup";

export type ContactFormProps = {
  mode: "new" | "edit";
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  initial: Record<string, string>;
  cancelHref: string;
  contactId?: string;
  account: { id: string; name: string } | null;
  reportsTo: { id: string; firstName: string | null; lastName: string } | null;
  salutations: readonly string[];
  countries: CountryOption[];
  owner: { label: string; options: { id: string; label: string }[] | null };
};

const REQUIRED = "Complete this field.";
const textareaClasses = "w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-600";

export function ContactForm(props: ContactFormProps) {
  const [state, formAction, pending] = useActionState(props.action, { ok: true } as ContactFormState);
  const [values, setValues] = useState<Record<string, string>>(state.values ?? props.initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const serverError = (key: string) => state.fieldErrors?.[key];
  const clientError = (key: string) => (key === "lastName" && touched.lastName && !(values.lastName ?? "").trim() ? REQUIRED : undefined);
  const errorFor = (key: string) => clientError(key) ?? serverError(key);
  const changed = (key: string) => (values[key] ?? "") !== (props.initial[key] ?? "");

  const field = (name: string, label: string, control: ReactNode, options: { required?: boolean; hint?: string } = {}) => {
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
        ) : options.hint ? (
          <span className="text-xs text-slate-500">{options.hint}</span>
        ) : null}
      </div>
    );
  };

  const text = (name: string, options: { type?: string; maxLength?: number } = {}) => (
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

  const countryKey = "mailingCountryCode";
  const stateKey = "mailingStateCode";
  const country = props.countries.find((item) => item.code === values[countryKey]);

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        if (!(values.lastName ?? "").trim()) {
          event.preventDefault();
          setTouched((current) => ({ ...current, lastName: true }));
          document.getElementById("field-lastName")?.focus();
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
          {field(
            "salutation",
            "Salutation",
            <select id="field-salutation" name="salutation" value={values.salutation ?? ""} onChange={(event) => set("salutation", event.target.value)} className={inputClasses}>
              <option value="">--None--</option>
              {props.salutations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>,
          )}
          {field("firstName", "First Name", text("firstName", { maxLength: 80 }))}
          {field("lastName", "Last Name", text("lastName", { maxLength: 80 }), { required: true })}
          <AccountLookup initial={props.account} error={serverError("accountId")} />
          {field("title", "Title", text("title", { maxLength: 128 }))}
          <ReportsToLookup initial={props.reportsTo} excludeId={props.contactId} error={serverError("reportsToId")} />
          {field(
            "ownerId",
            "Contact Owner",
            props.owner.options ? (
              <select id="field-ownerId" name="ownerId" value={values.ownerId ?? ""} onChange={(event) => set("ownerId", event.target.value)} className={inputClasses}>
                {props.owner.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <p id="field-ownerId" className="flex h-8 items-center rounded border border-slate-200 bg-slate-50 px-2 text-slate-700">
                {props.owner.label}
              </p>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="form-touch">
        <h3 id="form-touch" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          Get in Touch
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {field("phone", "Phone", text("phone", { type: "tel", maxLength: 40 }))}
          {field("email", "Email", text("email", { maxLength: 255 }))}
          {field(
            "description",
            "Description",
            <textarea id="field-description" name="description" rows={3} maxLength={32000} value={values.description ?? ""} onChange={(event) => set("description", event.target.value)} className={textareaClasses} />,
          )}
          <fieldset className="flex flex-col gap-3 rounded border border-slate-200 p-3 md:col-span-2">
            <legend className="px-1 text-sm font-medium">Mailing Address</legend>
            {field(
              countryKey,
              "Mailing Country",
              <select
                id={`field-${countryKey}`}
                name={countryKey}
                value={values[countryKey] ?? ""}
                onChange={(event) => {
                  set(countryKey, event.target.value);
                  set(stateKey, "");
                }}
                className={inputClasses}
              >
                <option value="">--None--</option>
                {props.countries.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "mailingStreet",
              "Mailing Street",
              <textarea id="field-mailingStreet" name="mailingStreet" rows={2} maxLength={255} value={values.mailingStreet ?? ""} onChange={(event) => set("mailingStreet", event.target.value)} className={textareaClasses} />,
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {field("mailingCity", "Mailing City", text("mailingCity", { maxLength: 40 }))}
              {field(
                stateKey,
                "Mailing State/Province",
                <select id={`field-${stateKey}`} name={stateKey} value={values[stateKey] ?? ""} disabled={!country || country.states.length === 0} onChange={(event) => set(stateKey, event.target.value)} className={inputClasses}>
                  <option value="">--None--</option>
                  {(country?.states ?? []).map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>,
                { hint: country && country.states.length === 0 ? "No state/province values for this country." : undefined },
              )}
            </div>
            {field("mailingPostalCode", "Mailing Zip/Postal Code", text("mailingPostalCode", { maxLength: 20 }))}
          </fieldset>
        </div>
      </section>

      <footer className="sticky bottom-0 flex justify-center gap-2 border-t border-slate-200 bg-white py-3">
        <Link href={props.cancelHref} className={buttonClasses.neutral}>
          Cancel
        </Link>
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

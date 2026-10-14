"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type ReactNode } from "react";
import type { AccountFormState } from "@/app/accounts/actions";
import { buttonClasses, inputClasses } from "@/components/ui/modal";
import type { CountryOption, PicklistOption } from "@/lib/accounts/picklists";
import { ParentLookup } from "./parent-lookup";

export type AccountFormProps = {
  mode: "new" | "edit";
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  initial: Record<string, string>;
  parent: { id: string; name: string } | null;
  accountId?: string;
  picklists: Record<"type" | "industry" | "rating" | "ownership" | "accountSource", readonly PicklistOption[]>;
  countries: CountryOption[];
  owner: { label: string; options: { id: string; label: string }[] | null };
};

const REQUIRED = "Complete this field.";
const textareaClasses = "w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-600";

// Formulaire New / Edit Account. Observé : sections About et Get in Touch,
// Account Name obligatoire (« Complete this field. » au blur), Owner en
// lecture seule, pays/état dépendants, Save / Save & New / Cancel, Undo par
// champ. Les champs hors formulaire observé sont regroupés dans
// « Additional Information » (conçu).
export function AccountForm(props: AccountFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(props.action, { ok: true } as AccountFormState);
  const [values, setValues] = useState<Record<string, string>>(state.values ?? props.initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const serverError = (key: string) => state.fieldErrors?.[key];
  const clientError = (key: string) => (key === "name" && touched.name && !(values.name ?? "").trim() ? REQUIRED : undefined);
  const errorFor = (key: string) => clientError(key) ?? serverError(key);
  const changed = (key: string) => (values[key] ?? "") !== (props.initial[key] ?? "");

  const cancel = () => {
    if (window.history.length > 1) router.back();
    else router.push("/accounts");
  };

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

  const text = (name: string, options: { type?: string; maxLength?: number; inputMode?: "numeric" } = {}) => (
    <input
      id={`field-${name}`}
      name={name}
      type={options.type ?? "text"}
      inputMode={options.inputMode}
      maxLength={options.maxLength}
      value={values[name] ?? ""}
      onChange={(event) => set(name, event.target.value)}
      onBlur={() => setTouched((current) => ({ ...current, [name]: true }))}
      aria-invalid={!!errorFor(name)}
      aria-describedby={errorFor(name) ? `error-${name}` : undefined}
      className={`${inputClasses} ${errorFor(name) ? "border-red-600" : ""}`}
    />
  );

  const select = (name: string, options: readonly PicklistOption[]) => (
    <select id={`field-${name}`} name={name} value={values[name] ?? ""} onChange={(event) => set(name, event.target.value)} className={inputClasses}>
      <option value="">--None--</option>
      {options
        .filter((option) => option.active || option.value === values[name])
        .map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.active ? "" : " (inactive)"}
          </option>
        ))}
    </select>
  );

  const addressGroup = (prefix: "billing" | "shipping", legend: string) => {
    const word = legend.split(" ")[0];
    const countryKey = `${prefix}CountryCode`;
    const stateKey = `${prefix}StateCode`;
    const country = props.countries.find((c) => c.code === values[countryKey]);
    return (
      <fieldset className="flex flex-col gap-3 rounded border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium">{legend}</legend>
        {field(
          countryKey,
          `${word} Country`,
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
          `${prefix}Street`,
          `${word} Street`,
          <textarea id={`field-${prefix}Street`} name={`${prefix}Street`} rows={2} value={values[`${prefix}Street`] ?? ""} onChange={(event) => set(`${prefix}Street`, event.target.value)} className={textareaClasses} />,
        )}
        <div className="grid grid-cols-2 gap-3">
          {field(`${prefix}City`, `${word} City`, text(`${prefix}City`, { maxLength: 40 }))}
          {field(
            stateKey,
            `${word} State/Province`,
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
        {field(`${prefix}PostalCode`, `${word} Zip/Postal Code`, text(`${prefix}PostalCode`, { maxLength: 20 }))}
      </fieldset>
    );
  };

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        if (!(values.name ?? "").trim()) {
          event.preventDefault();
          setTouched((current) => ({ ...current, name: true }));
          document.getElementById("field-name")?.focus();
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
          {field("name", "Account Name", text("name", { maxLength: 255 }), { required: true })}
          {field("website", "Website", text("website", { maxLength: 255 }))}
          {field("type", "Type", select("type", props.picklists.type))}
          {field(
            "description",
            "Description",
            <textarea id="field-description" name="description" rows={3} maxLength={32000} value={values.description ?? ""} onChange={(event) => set("description", event.target.value)} className={textareaClasses} />,
          )}
          <ParentLookup initial={props.parent} excludeId={props.accountId} error={serverError("parentId")} />
          {field(
            "ownerId",
            "Account Owner",
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

      <section aria-labelledby="form-contact">
        <h3 id="form-contact" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          Get in Touch
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {field("phone", "Phone", text("phone", { type: "tel", maxLength: 40 }))}
          <div aria-hidden className="hidden md:block" />
          {addressGroup("billing", "Billing Address")}
          {addressGroup("shipping", "Shipping Address")}
        </div>
      </section>

      <details className="rounded border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Additional Information</summary>
        <p className="mt-1 text-xs text-slate-500">Fields of the Account object that are not on the observed Salesforce “New Account” form (CRM Lab design).</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {field("industry", "Industry", select("industry", props.picklists.industry))}
          {field("rating", "Rating", select("rating", props.picklists.rating))}
          {field("accountSource", "Account Source", select("accountSource", props.picklists.accountSource))}
          {field("ownership", "Ownership", select("ownership", props.picklists.ownership))}
          {field("annualRevenue", "Annual Revenue", text("annualRevenue", { inputMode: "numeric" }))}
          {field("numberOfEmployees", "Employees", text("numberOfEmployees", { inputMode: "numeric" }))}
          {field("fax", "Fax", text("fax", { type: "tel", maxLength: 40 }))}
          {field("accountNumber", "Account Number", text("accountNumber", { maxLength: 40 }))}
          {field("site", "Account Site", text("site", { maxLength: 80 }))}
          {field("tickerSymbol", "Ticker Symbol", text("tickerSymbol", { maxLength: 20 }))}
          {field("sic", "SIC Code", text("sic", { maxLength: 20 }))}
          {field("sicDesc", "SIC Description", text("sicDesc", { maxLength: 80 }))}
          {field("jigsaw", "Data.com Key", text("jigsaw", { maxLength: 20 }))}
          {field("tier", "Einstein Account Tier", text("tier", { maxLength: 2 }))}
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isBuyer" value="true" checked={values.isBuyer === "true"} onChange={(event) => set("isBuyer", event.target.checked ? "true" : "false")} />
              Buyer Account
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isCustomerPortal" value="true" checked={values.isCustomerPortal === "true"} onChange={(event) => set("isCustomerPortal", event.target.checked ? "true" : "false")} />
              Customer Portal Account
            </label>
          </div>
        </div>
      </details>

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

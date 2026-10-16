"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, type ReactNode } from "react";
import type { LeadFormState } from "@/app/leads/actions";
import { buttonClasses, inputClasses } from "@/components/ui/modal";

const REQUIRED = "Complete this field.";
const UNQUALIFIED = "An unqualified lead cannot be qualified.";
const textareaClasses = "w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-600";
const STATUSES = [
  { value: "New", label: "New" },
  { value: "Working", label: "Working" },
  { value: "Unqualified", label: "Unqualified" },
] as const;

export type LeadFormProps = {
  mode: "new" | "edit";
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  initial: Record<string, string>;
  owner: { label: string; options: { id: string; label: string }[] | null };
};

export function LeadForm(props: LeadFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(props.action, { ok: true } as LeadFormState);
  const [values, setValues] = useState<Record<string, string>>(state.values ?? props.initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const serverError = (key: string) => state.fieldErrors?.[key];
  const clientError = (key: string) => {
    if ((key === "lastName" || key === "company") && touched[key] && !(values[key] ?? "").trim()) return REQUIRED;
    if (key === "qualified" && values.status === "Unqualified" && values.qualified === "true") return UNQUALIFIED;
    return undefined;
  };
  const errorFor = (key: string) => clientError(key) ?? serverError(key);
  const changed = (key: string) => (values[key] ?? "") !== (props.initial[key] ?? "");

  const cancel = () => {
    if (window.history.length > 1) router.back();
    else router.push("/leads");
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
        const missing = !(values.lastName ?? "").trim() ? "lastName" : !(values.company ?? "").trim() ? "company" : null;
        const unqualified = values.status === "Unqualified" && values.qualified === "true";
        if (missing || unqualified) {
          event.preventDefault();
          setTouched((current) => ({ ...current, lastName: true, company: true, qualified: true }));
          document.getElementById(missing ? `field-${missing}` : "field-qualified")?.focus();
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
          {field("firstName", "First Name", text("firstName", { maxLength: 80 }))}
          {field("lastName", "Last Name", text("lastName", { maxLength: 80 }), { required: true })}
          {field("company", "Company", text("company", { maxLength: 255 }), { required: true })}
          {field("title", "Title", text("title", { maxLength: 128 }))}
          {field(
            "status",
            "Status",
            <select id="field-status" name="status" value={values.status ?? "New"} onChange={(event) => set("status", event.target.value)} className={inputClasses}>
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>,
          )}
          <div className="flex flex-col gap-1 text-sm">
            <span id="qualified-label">Qualified</span>
            <input type="hidden" name="qualified" value={values.qualified === "true" ? "true" : "false"} />
            <label className="flex h-8 items-center gap-2">
              <input
                id="field-qualified"
                type="checkbox"
                checked={values.qualified === "true"}
                aria-labelledby="qualified-label"
                onChange={(event) => set("qualified", event.target.checked ? "true" : "false")}
              />
              Qualified
            </label>
            {errorFor("qualified") ? (
              <span id="error-qualified" role="alert" className="text-xs text-red-700">
                {errorFor("qualified")}
              </span>
            ) : null}
          </div>
          {field(
            "ownerId",
            "Lead Owner",
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
          {field(
            "description",
            "Description",
            <textarea
              id="field-description"
              name="description"
              rows={3}
              maxLength={32000}
              value={values.description ?? ""}
              onChange={(event) => set("description", event.target.value)}
              className={textareaClasses}
            />,
          )}
        </div>
      </section>

      <section aria-labelledby="form-contact">
        <h3 id="form-contact" className="mb-3 border-b border-slate-200 pb-1 text-sm font-semibold">
          Get in Touch
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {field("email", "Email", text("email", { maxLength: 255 }))}
          {field("phone", "Phone", text("phone", { type: "tel", maxLength: 40 }))}
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

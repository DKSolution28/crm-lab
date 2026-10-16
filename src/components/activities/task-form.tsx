"use client";

import { useActionState, useState, useSyncExternalStore, type ReactNode } from "react";
import { createTaskAction, updateTaskAction, type TaskFormState } from "@/app/activities/actions";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES, type ParentType } from "@/lib/activities/picklists";
import { buttonClasses, inputClasses } from "@/components/ui/modal";

const REQUIRED = "Complete this field.";
const initialState = { ok: true } as TaskFormState;

export function TaskForm({
  parentType,
  parentId,
  assignees,
  defaultAssigneeId,
}: {
  parentType: ParentType;
  parentId: string;
  assignees: { id: string; label: string }[];
  defaultAssigneeId: string;
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);
  const [values, setValues] = useState({
    subject: "",
    description: "",
    status: "NotStarted",
    priority: "Normal",
    dueDate: "",
    assigneeId: defaultAssigneeId,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const errorFor = (key: string) => {
    if (key === "subject" && touched.subject && !values.subject.trim()) return REQUIRED;
    return state.fieldErrors?.[key];
  };

  const field = (name: string, label: string, control: ReactNode, options: { required?: boolean } = {}) => {
    const error = errorFor(name);
    return (
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor={`task-${name}`}>
          {options.required ? (
            <abbr title="required" className="mr-0.5 text-red-600 no-underline">
              *
            </abbr>
          ) : null}
          {label}
        </label>
        {control}
        {error ? (
          <span id={`task-error-${name}`} role="alert" className="text-xs text-red-700">
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <form action={formAction} data-hydrated={hydrated ? "true" : "false"} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
      <h3 className="text-sm font-semibold text-slate-800 md:col-span-2">New Task</h3>
      <input type="hidden" name="parentType" value={parentType} />
      <input type="hidden" name="parentId" value={parentId} />
      {state.ok === false && state.error ? (
        <p role="alert" className="text-sm text-red-700 md:col-span-2">
          {state.error}
        </p>
      ) : null}
      {field(
        "subject",
        "Subject",
        <input
          id="task-subject"
          name="subject"
          maxLength={255}
          value={values.subject}
          aria-invalid={errorFor("subject") ? true : undefined}
          aria-describedby={errorFor("subject") ? "task-error-subject" : undefined}
          onBlur={() => setTouched((current) => ({ ...current, subject: true }))}
          onChange={(event) => set("subject", event.target.value)}
          className={inputClasses}
        />,
        { required: true },
      )}
      {field(
        "dueDate",
        "Due Date",
        <input id="task-dueDate" name="dueDate" type="date" value={values.dueDate} onChange={(event) => set("dueDate", event.target.value)} className={inputClasses} />,
      )}
      {field(
        "priority",
        "Priority",
        <select id="task-priority" name="priority" value={values.priority} onChange={(event) => set("priority", event.target.value)} className={inputClasses}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>,
      )}
      {field(
        "status",
        "Status",
        <select id="task-status" name="status" value={values.status} onChange={(event) => set("status", event.target.value)} className={inputClasses}>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>,
      )}
      {field(
        "assigneeId",
        "Assigned To",
        <select id="task-assigneeId" name="assigneeId" value={values.assigneeId} onChange={(event) => set("assigneeId", event.target.value)} className={inputClasses}>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </select>,
      )}
      <div className="flex flex-col gap-1 text-sm md:col-span-2">
        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          name="description"
          maxLength={32000}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          className="min-h-20 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses.brand}>
          Save Task
        </button>
      </div>
    </form>
  );
}

export function TaskStatusForm({ id, subject, status }: { id: string; subject: string; status: string }) {
  const [state, formAction, pending] = useActionState(updateTaskAction.bind(null, id), initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status for {subject}
      </label>
      <select id={`status-${id}`} name="status" defaultValue={status} aria-label={`Status for ${subject}`} className={`${inputClasses} w-auto`}>
        {TASK_STATUSES.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABELS[item]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={buttonClasses.neutral} aria-label={`Update status for ${subject}`}>
        Update status
      </button>
      {state.ok === false && state.error ? (
        <span role="alert" className="text-xs text-red-700">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

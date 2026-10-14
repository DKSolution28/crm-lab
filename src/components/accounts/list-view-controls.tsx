"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  cloneViewAction,
  createViewAction,
  deleteViewAction,
  renameViewAction,
  setColumnsAction,
  setVisibilityAction,
  type ActionResult,
} from "@/app/accounts/actions";
import { Modal, buttonClasses, inputClasses } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { ListViewDto } from "./types";
import { useListUrl } from "./use-list-url";

type ColumnOption = { key: string; label: string };
type DialogKind = "new" | "clone" | "rename" | "sharing" | "columns" | "delete" | null;

const MENU_ITEMS: { kind: DialogKind; label: string; needsManage: boolean; notOnSystem?: boolean }[] = [
  { kind: "new", label: "New", needsManage: false },
  { kind: "clone", label: "Clone", needsManage: false },
  { kind: "rename", label: "Rename", needsManage: true },
  { kind: "sharing", label: "Sharing Settings", needsManage: true, notOnSystem: true },
  { kind: "columns", label: "Select Fields to Display", needsManage: true },
  { kind: "delete", label: "Delete", needsManage: true, notOnSystem: true },
];

export function ListViewControls({ view, columnOptions }: { view: ListViewDto; columnOptions: ColumnOption[] }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-label="List View Controls"
        title="List View Controls"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses.icon}
      >
        ⚙
      </button>
      {open ? (
        <ul role="menu" aria-label="List View Controls" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {MENU_ITEMS.map((item) => {
            const disabled = (item.needsManage && !view.canManage) || (item.notOnSystem && view.isSystem);
            return (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  title={disabled ? "Not available for this list view" : undefined}
                  onClick={() => {
                    setOpen(false);
                    setDialog(item.kind);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {item.label}
                </button>
              </li>
            );
          })}
          <li role="none">
            <button type="button" role="menuitem" disabled title="Column widths are not persisted in CRM Lab" className="block w-full px-3 py-1.5 text-left text-sm text-slate-400">
              Reset Column Widths
            </button>
          </li>
        </ul>
      ) : null}
      {dialog === "new" ? <NewViewDialog onClose={() => setDialog(null)} /> : null}
      {dialog === "clone" ? <CloneViewDialog view={view} onClose={() => setDialog(null)} /> : null}
      {dialog === "rename" ? <RenameViewDialog view={view} onClose={() => setDialog(null)} /> : null}
      {dialog === "sharing" ? <SharingDialog view={view} onClose={() => setDialog(null)} /> : null}
      {dialog === "columns" ? <ColumnsDialog view={view} columnOptions={columnOptions} onClose={() => setDialog(null)} /> : null}
      {dialog === "delete" ? <DeleteDialog view={view} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function useViewAction(onClose: () => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();
  const { update, refresh } = useListUrl();
  const submit = (action: () => Promise<ActionResult>, success: (result: Extract<ActionResult, { ok: true }>) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      success(result);
      onClose();
    });
  return { pending, error, submit, notify, update, refresh };
}

function NewViewDialog({ onClose }: { onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "EVERYONE">("PRIVATE");
  const [scope, setScope] = useState<"ALL" | "MINE">("ALL");
  const { pending, error, submit, notify, update } = useViewAction(onClose);
  return (
    <Modal
      title="New List View"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            disabled={pending}
            onClick={() =>
              submit(
                () => createViewAction({ label, visibility, scope }),
                (result) => {
                  notify("success", `List view "${result.label}" was created.`);
                  update({ view: result.id!, page: null, sort: null, dir: null });
                },
              )
            }
          >
            Save
          </button>
        </>
      }
    >
      <ViewForm label={label} setLabel={setLabel} visibility={visibility} setVisibility={setVisibility} scope={scope} setScope={setScope} error={error} />
    </Modal>
  );
}

function ViewForm(props: {
  label: string;
  setLabel: (v: string) => void;
  visibility?: "PRIVATE" | "EVERYONE";
  setVisibility?: (v: "PRIVATE" | "EVERYONE") => void;
  scope?: "ALL" | "MINE";
  setScope?: (v: "ALL" | "MINE") => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {props.error ? <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{props.error}</p> : null}
      <label className="flex flex-col gap-1 text-sm">
        <span>
          <abbr title="required" className="text-red-600 no-underline">
            *
          </abbr>{" "}
          List Name
        </span>
        <input value={props.label} onChange={(event) => props.setLabel(event.target.value)} maxLength={80} className={inputClasses} />
      </label>
      {props.setScope ? (
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Filter by Owner</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={props.scope === "ALL"} onChange={() => props.setScope?.("ALL")} /> All accounts
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={props.scope === "MINE"} onChange={() => props.setScope?.("MINE")} /> My accounts
          </label>
        </fieldset>
      ) : null}
      {props.setVisibility ? (
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Who sees this list view?</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="visibility" checked={props.visibility === "PRIVATE"} onChange={() => props.setVisibility?.("PRIVATE")} /> Only I can see this list view
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="visibility" checked={props.visibility === "EVERYONE"} onChange={() => props.setVisibility?.("EVERYONE")} /> All users can see this list view
          </label>
        </fieldset>
      ) : null}
    </div>
  );
}

function CloneViewDialog({ view, onClose }: { view: ListViewDto; onClose: () => void }) {
  const [label, setLabel] = useState(`${view.label} (copy)`);
  const { pending, error, submit, notify, update } = useViewAction(onClose);
  return (
    <Modal
      title="Clone List View"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            disabled={pending}
            onClick={() =>
              submit(
                () => cloneViewAction(view.id, label),
                (result) => {
                  notify("success", `List view "${result.label}" was created.`);
                  update({ view: result.id!, page: null });
                },
              )
            }
          >
            Save
          </button>
        </>
      }
    >
      <ViewForm label={label} setLabel={setLabel} error={error} />
    </Modal>
  );
}

function RenameViewDialog({ view, onClose }: { view: ListViewDto; onClose: () => void }) {
  const [label, setLabel] = useState(view.label);
  const { pending, error, submit, notify, refresh } = useViewAction(onClose);
  return (
    <Modal
      title="Rename List View"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            disabled={pending}
            onClick={() =>
              submit(
                () => renameViewAction(view.id, label),
                (result) => {
                  notify("success", `List view renamed to "${result.label}".`);
                  refresh();
                },
              )
            }
          >
            Save
          </button>
        </>
      }
    >
      <ViewForm label={label} setLabel={setLabel} error={error} />
    </Modal>
  );
}

function SharingDialog({ view, onClose }: { view: ListViewDto; onClose: () => void }) {
  const [visibility, setVisibility] = useState(view.visibility);
  const { pending, error, submit, notify, refresh } = useViewAction(onClose);
  return (
    <Modal
      title="Sharing Settings"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            disabled={pending}
            onClick={() =>
              submit(
                () => setVisibilityAction(view.id, visibility),
                () => {
                  notify("success", "Sharing settings were saved.");
                  refresh();
                },
              )
            }
          >
            Save
          </button>
        </>
      }
    >
      <ViewForm label={view.label} setLabel={() => undefined} visibility={visibility} setVisibility={setVisibility} error={error} />
    </Modal>
  );
}

function ColumnsDialog({ view, columnOptions, onClose }: { view: ListViewDto; columnOptions: ColumnOption[]; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(view.columns);
  const { pending, error, submit, notify, refresh } = useViewAction(onClose);
  const available = columnOptions.filter((option) => !selected.includes(option.key));
  const move = (key: string, direction: -1 | 1) => {
    const index = selected.indexOf(key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  };
  return (
    <Modal
      title="Select Fields to Display"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.brand}
            disabled={pending}
            onClick={() =>
              submit(
                () => setColumnsAction(view.id, selected),
                () => {
                  notify("success", "Columns were saved.");
                  refresh();
                },
              )
            }
          >
            Save
          </button>
        </>
      }
    >
      {error ? <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h3 className="mb-2 font-medium">Available Fields</h3>
          <ul className="max-h-80 overflow-y-auto rounded border border-slate-200">
            {available.map((option) => (
              <li key={option.key} className="flex items-center justify-between border-b border-slate-100 px-2 py-1 last:border-b-0">
                <span>{option.label}</span>
                <button type="button" onClick={() => setSelected([...selected, option.key])} className="text-blue-700 hover:underline" aria-label={`Add ${option.label}`}>
                  Add ›
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-medium">Visible Fields</h3>
          <ul className="max-h-80 overflow-y-auto rounded border border-slate-200">
            {selected.map((key) => {
              const option = columnOptions.find((o) => o.key === key);
              return (
                <li key={key} className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1 last:border-b-0">
                  <span className="flex-1">{option?.label ?? key}</span>
                  <button type="button" onClick={() => move(key, -1)} aria-label={`Move ${option?.label} up`} className="px-1 text-slate-600 hover:text-slate-900">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(key, 1)} aria-label={`Move ${option?.label} down`} className="px-1 text-slate-600 hover:text-slate-900">
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={key === "name"}
                    onClick={() => setSelected(selected.filter((k) => k !== key))}
                    className="text-blue-700 hover:underline disabled:text-slate-400"
                    aria-label={`Remove ${option?.label}`}
                  >
                    ‹ Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function DeleteDialog({ view, onClose }: { view: ListViewDto; onClose: () => void }) {
  const { pending, error, submit, notify, update } = useViewAction(onClose);
  return (
    <Modal
      title="Delete List View"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonClasses.neutral} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClasses.destructive}
            disabled={pending}
            onClick={() =>
              submit(
                () => deleteViewAction(view.id),
                () => {
                  notify("success", `List view "${view.label}" was deleted.`);
                  update({ view: "AllAccounts", page: null, sort: null, dir: null });
                },
              )
            }
          >
            Delete
          </button>
        </>
      }
    >
      {error ? <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <p className="text-sm text-slate-800">
        Are you sure you want to delete the list view <strong>{view.label}</strong>? Accounts are not deleted.
      </p>
    </Modal>
  );
}

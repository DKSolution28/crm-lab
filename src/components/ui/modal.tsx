"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  /** Désactive la fermeture par Escape (observé : Escape ferme la modale New Account). */
  closeOnEscape?: boolean;
};

export function Modal({ title, onClose, children, footer, size = "md", closeOnEscape = true }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([aria-label='Cancel and close'])");
    focusable?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose, closeOnEscape]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-10">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative flex max-h-[calc(100vh-5rem)] w-full flex-col rounded-lg bg-white shadow-2xl ${size === "lg" ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel and close"
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl text-slate-700 shadow hover:bg-slate-100"
        >
          ×
        </button>
        <header className="border-b border-slate-200 px-6 py-4 text-center">
          <h2 id="modal-title" className="text-xl font-semibold text-slate-900">
            {title}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <footer className="flex justify-center gap-2 border-t border-slate-200 px-6 py-3">{footer}</footer> : null}
      </div>
    </div>
  );
}

export const buttonClasses = {
  neutral:
    "inline-flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-blue-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  brand:
    "inline-flex h-8 items-center justify-center rounded border border-blue-700 bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50",
  destructive:
    "inline-flex h-8 items-center justify-center rounded border border-red-700 bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50",
  icon: "inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50",
};

export const inputClasses =
  "h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100";

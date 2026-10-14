import type { ToastKind } from "./toast";

/** Décode le paramètre `?toast=kind:message` produit par les server actions. */
export const parseToast = (value: string | string[] | undefined): { kind: ToastKind; message: string } | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const [kind, ...rest] = raw.split(":");
  if (kind !== "success" && kind !== "error" && kind !== "info") return null;
  return { kind, message: rest.join(":") };
};

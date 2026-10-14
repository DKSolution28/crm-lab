// Utilisateur courant (conçu) : CRM Lab n'a pas d'authentification réelle.
// L'utilisateur de démonstration est choisi par cookie (interface) ou par
// l'en-tête `x-crm-lab-user` (API) ; à défaut, le premier administrateur.
import type { User, UserRole } from "@prisma/client";
import { prisma } from "../prisma";

export const USER_COOKIE = "crm-lab-user";
export const USER_HEADER = "x-crm-lab-user";

export type CurrentUser = Pick<User, "id" | "alias" | "firstName" | "lastName" | "role" | "pinnedAccountViewId">;

const DEFAULT_ADMIN = { alias: "demoadm", firstName: "Demo", lastName: "Admin", role: "ADMIN" as UserRole };

const select = { id: true, alias: true, firstName: true, lastName: true, role: true, pinnedAccountViewId: true } as const;

export const fullName = (user: Pick<User, "firstName" | "lastName">) => `${user.firstName} ${user.lastName}`.trim();

export const listUsers = () => prisma.user.findMany({ select, orderBy: [{ role: "asc" }, { alias: "asc" }] });

export const ensureDefaultUser = async (): Promise<CurrentUser> => {
  const existing = await prisma.user.findFirst({ select, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  if (existing) return existing;
  return prisma.user.create({ data: DEFAULT_ADMIN, select });
};

export const resolveUser = async (identifier: string | null | undefined): Promise<CurrentUser> => {
  if (identifier) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: identifier }, { alias: identifier }] },
      select,
    });
    if (user) return user;
  }
  return ensureDefaultUser();
};

/** Utilisateur courant pour les composants serveur et server actions. */
export const getCurrentUser = async (): Promise<CurrentUser> => {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return resolveUser(store.get(USER_COOKIE)?.value);
};

/** Utilisateur courant pour les route handlers (en-tête prioritaire sur le cookie). */
export const getRequestUser = async (request: Request): Promise<CurrentUser> => {
  const header = request.headers.get(USER_HEADER);
  if (header) return resolveUser(header);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((part) => part.startsWith(`${USER_COOKIE}=`));
  return resolveUser(match ? decodeURIComponent(match.slice(USER_COOKIE.length + 1)) : null);
};

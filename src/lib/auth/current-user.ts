// Session vérifiée : cookie signé `crm-lab-session`, utilisateur relu en base.
// L'en-tête `x-crm-lab-user` et un cookie non signé ne sont pas une identité.
import type { User, UserRole } from "@prisma/client";
import { prisma } from "../prisma";
import { readCookie, SESSION_COOKIE, UnauthenticatedError, verifySession } from "./session";
import { assertTrustedOrigin } from "./origin";

export const USER_COOKIE = "crm-lab-user";
export const USER_HEADER = "x-crm-lab-user";

export type CurrentUser = Pick<User, "id" | "alias" | "firstName" | "lastName" | "role" | "pinnedAccountViewId">;

const select = { id: true, alias: true, firstName: true, lastName: true, role: true, pinnedAccountViewId: true } as const;

export const fullName = (user: Pick<User, "firstName" | "lastName">) => `${user.firstName} ${user.lastName}`.trim();

export const listUsers = () => prisma.user.findMany({ select, orderBy: [{ role: "asc" }, { alias: "asc" }] });

const userFromToken = async (token: string | null | undefined): Promise<CurrentUser | null> => {
  const userId = verifySession(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select });
};

/** Utilisateur courant, ou null si la session est absente, expirée ou inconnue. */
export const readOptionalUser = async (): Promise<CurrentUser | null> => {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return userFromToken(store.get(SESSION_COOKIE)?.value);
};

/** Utilisateur courant pour les pages et server actions. Redirige vers /login. */
export const getCurrentUser = async (): Promise<CurrentUser> => {
  const user = await readOptionalUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user as CurrentUser;
};

/** Utilisateur courant pour les route handlers. 401 s'il n'y a pas de session valide. */
export const getRequestUser = async (request: Request): Promise<CurrentUser> => {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const user = await userFromToken(token);
  if (!user) throw new UnauthenticatedError();
  assertTrustedOrigin(request);
  return user;
};

export type { UserRole };

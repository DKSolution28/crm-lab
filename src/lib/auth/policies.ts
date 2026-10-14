// Règles d'autorisation de CRM Lab (conçues, non observées dans Salesforce :
// un seul profil était disponible pendant l'exploration).
//
// - Tout utilisateur lit tous les comptes et peut en créer.
// - Un compte est modifiable par son propriétaire ou par un administrateur.
// - Les vues système (All Accounts, My Accounts, …) ne sont modifiables que
//   par un administrateur ; les vues personnelles par leur propriétaire ou un
//   administrateur. Une vue est visible si elle est partagée (EVERYONE), si
//   elle appartient à l'utilisateur, ou si elle est système.
import type { CurrentUser } from "./current-user";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

type AccountLike = { ownerId: string };
type ListViewLike = { ownerId: string | null; isSystem: boolean; visibility: "PRIVATE" | "EVERYONE" };

export const isAdmin = (user: CurrentUser) => user.role === "ADMIN";

export const canEditAccount = (user: CurrentUser, account: AccountLike) => isAdmin(user) || account.ownerId === user.id;

export const canManageListView = (user: CurrentUser, view: ListViewLike) =>
  view.isSystem ? isAdmin(user) : isAdmin(user) || view.ownerId === user.id;

export const canSeeListView = (user: CurrentUser, view: ListViewLike) =>
  view.isSystem || view.visibility === "EVERYONE" || view.ownerId === user.id || isAdmin(user);

export const assert = (condition: boolean, message?: string) => {
  if (!condition) throw new AuthorizationError(message);
};

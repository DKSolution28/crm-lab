import { signSession, SESSION_COOKIE } from "../src/lib/auth/session";

const tokens = new Map<string, string>();

export const rememberUser = (user: { id: string; alias: string }) => {
  const token = signSession(user.id);
  tokens.set(user.alias, token);
  tokens.set(user.id, token);
};

export const sessionCookieHeader = (aliasOrId: string) => {
  const token = tokens.get(aliasOrId);
  if (!token) throw new Error(`No signed session for ${aliasOrId}. Call rememberUser first.`);
  return `${SESSION_COOKIE}=${token}`;
};

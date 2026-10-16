import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "crm-lab-session";

const MIN_SECRET_LENGTH = 32;

export class UnauthenticatedError extends Error {
  constructor(message = "Sign in required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export const sessionSecret = () => {
  const secret = process.env.CRM_LAB_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("CRM_LAB_SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
};

const ttlSeconds = () => {
  const parsed = Number(process.env.CRM_LAB_SESSION_TTL_SECONDS ?? 60 * 60 * 12);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 12;
};

/** Signed payload `{uid, exp}`. The cookie is not an alias and not a role. */
export const signSession = (userId: string, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: nowSeconds + ttlSeconds() })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

export const verifySession = (token: string | null | undefined, nowSeconds = Math.floor(Date.now() / 1000)): string | null => {
  if (!token) return null;
  const secret = process.env.CRM_LAB_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid?: unknown; exp?: unknown };
    if (typeof body.uid !== "string" || typeof body.exp !== "number" || body.exp < nowSeconds) return null;
    return body.uid;
  } catch {
    return null;
  }
};

export const readCookie = (cookieHeader: string | null | undefined, name: string) => {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) !== name) continue;
    return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
};

export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // `next start` sets NODE_ENV=production even on http://127.0.0.1. A Secure
  // cookie would be dropped there, so Secure is opt-in for an HTTPS deployment.
  secure: process.env.CRM_LAB_COOKIE_SECURE === "true",
  maxAge: ttlSeconds(),
});

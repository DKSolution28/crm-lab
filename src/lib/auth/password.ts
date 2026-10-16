import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/** Lab-only passwords for the two seeded users. They are not production secrets. */
export const DEMO_PASSWORDS = {
  demoadm: "demoadm-pass",
  demostd: "demostd-pass",
} as const;

export type DemoAlias = keyof typeof DEMO_PASSWORDS;

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${key.toString("base64url")}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const key = (await scrypt(password, salt, 32)) as Buffer;
  const actual = Buffer.from(hash, "base64url");
  if (actual.length !== key.length) return false;
  return timingSafeEqual(actual, key);
};

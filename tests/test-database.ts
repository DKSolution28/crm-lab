// Garde des tests qui écrivent en base. TEST_DATABASE_URL est la seule source
// acceptée : DATABASE_URL et le repli historique vers crm_lab sont ignorés.

export class UnsafeTestDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTestDatabaseError";
  }
}

/** Port du serveur de développement habituel. Les E2E ne doivent pas le réutiliser. */
export const DEV_SERVER_PORT = 3000;

/** Port du serveur Next lancé par Playwright, distinct du serveur de développement. */
export const E2E_PORT = 3100;

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const FORBIDDEN_DATABASES = new Set(["crm_lab", "postgres", "template0", "template1"]);
const PRODUCTION_DATABASE = /(^|_)(prod|production|live)(_|$)/i;

export type DatabaseTarget = {
  url: string;
  host: string;
  database: string;
};

export type TestEnv = {
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
};

const requireText = (value: string | undefined, message: string): string => {
  const text = value?.trim() ?? "";
  if (!text) throw new UnsafeTestDatabaseError(message);
  return text;
};

export const parseTestDatabaseUrl = (raw: string): DatabaseTarget => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeTestDatabaseError("TEST_DATABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new UnsafeTestDatabaseError("TEST_DATABASE_URL must use the postgresql protocol.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new UnsafeTestDatabaseError(`Host "${host || "(missing)"}" is not allowed for tests. Use 127.0.0.1, localhost, or ::1.`);
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database || database.includes("/")) {
    throw new UnsafeTestDatabaseError("TEST_DATABASE_URL must name a single database.");
  }
  assertDatabaseNameAllowed(database);
  return { url: raw.trim(), host, database };
};

export const assertDatabaseNameAllowed = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  if (!normalized || FORBIDDEN_DATABASES.has(normalized) || PRODUCTION_DATABASE.test(normalized)) {
    throw new UnsafeTestDatabaseError(`Database "${name}" is not allowed for tests.`);
  }
  return normalized;
};

export const assertTestDatabaseUrl = (source: TestEnv = process.env as TestEnv): string => {
  if (!source.TEST_DATABASE_URL?.trim()) {
    throw new UnsafeTestDatabaseError("TEST_DATABASE_URL is required for tests that write to the database. DATABASE_URL is ignored.");
  }
  return parseTestDatabaseUrl(requireText(source.TEST_DATABASE_URL, "TEST_DATABASE_URL is required for tests that write to the database. DATABASE_URL is ignored.")).url;
};

export const databaseNameOf = (url: string): string => parseTestDatabaseUrl(url).database;

/** Valide TEST_DATABASE_URL puis l'impose à DATABASE_URL pour Prisma et Next. */
export const applyTestDatabaseUrl = (source: TestEnv = process.env as TestEnv): string => {
  const url = assertTestDatabaseUrl(source);
  source.DATABASE_URL = url;
  return url;
};

export const assertIsolatedE2EPort = (port: number): number => {
  if (port === DEV_SERVER_PORT) {
    throw new UnsafeTestDatabaseError("E2E must use a dedicated port. Refusing the dev server port 3000.");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new UnsafeTestDatabaseError(`E2E port ${port} is not a valid TCP port.`);
  }
  return port;
};

export const assertCleanupPrefix = (prefix: string): string => {
  if (prefix.trim().length < 3) {
    throw new UnsafeTestDatabaseError("Refusing to clean records without a specific name prefix.");
  }
  return prefix;
};

/**
 * À appeler immédiatement avant un deleteMany de test. Lit le nom réel de la
 * base connectée et refuse crm_lab, une base de production, ou une base
 * différente de TEST_DATABASE_URL.
 */
export const assertConnectedTestDatabase = async (readCurrentDatabase: () => Promise<string>, source: TestEnv = process.env as TestEnv): Promise<string> => {
  const expected = databaseNameOf(assertTestDatabaseUrl(source));
  const actual = (await readCurrentDatabase()).trim();
  assertDatabaseNameAllowed(actual);
  if (actual !== expected) {
    throw new UnsafeTestDatabaseError(`Refusing to use database "${actual}"; TEST_DATABASE_URL names "${expected}".`);
  }
  return actual;
};

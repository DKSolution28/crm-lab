import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT, applyTestDatabaseUrl, assertIsolatedE2EPort } from "./tests/test-database";

const port = assertIsolatedE2EPort(E2E_PORT);
const testDatabaseUrl = applyTestDatabaseUrl();
const sessionSecret =
  process.env.CRM_LAB_SESSION_SECRET && process.env.CRM_LAB_SESSION_SECRET.length >= 32
    ? process.env.CRM_LAB_SESSION_SECRET
    : "test-only-session-secret-32chars-minimum";
process.env.CRM_LAB_SESSION_SECRET = sessionSecret;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Les specs partagent la base jetable : un seul worker.
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: { storageState: "e2e/.auth/admin.json" },
    },
  ],
  webServer: {
    // Production server: `next dev` reloads the document while Turbopack compiles,
    // which aborts Playwright navigations. `next start` does not.
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      CRM_LAB_SESSION_SECRET: sessionSecret,
      CRM_LAB_COOKIE_SECURE: "false",
    },
  },
});

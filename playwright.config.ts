import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT, applyTestDatabaseUrl, assertIsolatedE2EPort } from "./tests/test-database";

const port = assertIsolatedE2EPort(E2E_PORT);
const testDatabaseUrl = applyTestDatabaseUrl();

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
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});

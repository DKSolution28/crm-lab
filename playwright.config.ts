import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Les specs partagent la base PostgreSQL locale : un seul worker.
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

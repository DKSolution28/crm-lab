import { mkdirSync } from "node:fs";
import { test } from "@playwright/test";
import { ensureDemoUsers, login } from "./helpers/session";

test("sign in as the demo admin", async ({ page }) => {
  test.setTimeout(60_000);
  await ensureDemoUsers();
  await login(page, "demoadm");
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});

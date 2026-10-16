import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORDS, hashPassword, type DemoAlias } from "../../src/lib/auth/password";
import { SESSION_COOKIE, signSession } from "../../src/lib/auth/session";
import { assertTestDatabaseUrl } from "../../tests/test-database";

const demoUser = {
  demoadm: { firstName: "Demo", lastName: "Admin", role: "ADMIN" as const },
  demostd: { firstName: "Demo", lastName: "Standard", role: "STANDARD" as const },
};

export const ensureDemoUsers = async () => {
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  try {
    for (const alias of ["demoadm", "demostd"] as const) {
      const passwordHash = await hashPassword(DEMO_PASSWORDS[alias]);
      const profile = demoUser[alias];
      await db.user.upsert({
        where: { alias },
        update: { passwordHash, ...profile },
        create: { alias, passwordHash, ...profile },
      });
    }
  } finally {
    await db.$disconnect();
  }
};

export const authCookie = async (alias: string) => {
  const db = new PrismaClient({ datasourceUrl: assertTestDatabaseUrl() });
  try {
    const user = await db.user.findUniqueOrThrow({ where: { alias }, select: { id: true } });
    return `${SESSION_COOKIE}=${signSession(user.id)}`;
  } finally {
    await db.$disconnect();
  }
};

export const login = async (page: Page, alias: DemoAlias) => {
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", { data: { alias, password: DEMO_PASSWORDS[alias] } });
  expect(response.status()).toBe(200);
  await page.goto("/accounts");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
};

export const loginThroughTheForm = async (page: Page, alias: DemoAlias) => {
  await page.context().clearCookies();
  await page.goto("/login");
  const button = page.getByRole("button", { name: "Sign in" });
  await expect(button).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Alias").fill(alias);
  await page.getByLabel("Password").fill(DEMO_PASSWORDS[alias]);
  await button.click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
};

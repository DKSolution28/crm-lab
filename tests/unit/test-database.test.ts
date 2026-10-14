import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  E2E_PORT,
  UnsafeTestDatabaseError,
  applyTestDatabaseUrl,
  assertCleanupPrefix,
  assertConnectedTestDatabase,
  assertIsolatedE2EPort,
  assertTestDatabaseUrl,
} from "../test-database";

const safe = "postgresql://ubuntu@127.0.0.1:5432/crm_phase32_test";
const dev = "postgresql://ubuntu@127.0.0.1:5432/crm_lab";

describe("TEST_DATABASE_URL", () => {
  it("requires TEST_DATABASE_URL and ignores DATABASE_URL", () => {
    assert.throws(() => assertTestDatabaseUrl({}), /TEST_DATABASE_URL is required/);
    assert.throws(() => assertTestDatabaseUrl({ DATABASE_URL: safe }), /DATABASE_URL is ignored/);
    assert.throws(() => assertTestDatabaseUrl({ DATABASE_URL: dev, TEST_DATABASE_URL: "  " }), /TEST_DATABASE_URL is required/);
  });

  it("refuses the development database, production names, and non-loopback hosts", () => {
    const refused = [
      dev,
      "postgresql://ubuntu@127.0.0.1:5432/CRM_LAB",
      "postgresql://ubuntu@localhost:5432/production",
      "postgresql://ubuntu@127.0.0.1:5432/crm_prod",
      "postgresql://ubuntu@127.0.0.1:5432/live",
      "postgresql://ubuntu@127.0.0.1:5432/postgres",
      "postgresql://ubuntu@db.example.com:5432/crm_phase32_test",
      "postgresql://ubuntu@10.1.2.3:5432/crm_phase32_test",
      "postgresql://ubuntu@127.0.0.2:5432/crm_phase32_test",
      "mysql://ubuntu@127.0.0.1:3306/crm_phase32_test",
      "not a url",
    ];
    for (const url of refused) {
      assert.throws(() => assertTestDatabaseUrl({ TEST_DATABASE_URL: url }), UnsafeTestDatabaseError);
    }
  });

  it("accepts a disposable database on loopback and replaces a dangerous DATABASE_URL only after that check", () => {
    for (const url of [safe, "postgresql://ubuntu@localhost:5432/crm_phase32_test", "postgresql://ubuntu@[::1]:5432/crm_phase32_test"]) {
      assert.equal(assertTestDatabaseUrl({ TEST_DATABASE_URL: url }), url);
    }
    const blocked = { DATABASE_URL: safe, TEST_DATABASE_URL: dev };
    assert.throws(() => applyTestDatabaseUrl(blocked), /crm_lab/);
    assert.equal(blocked.DATABASE_URL, safe);

    const allowed = { DATABASE_URL: dev, TEST_DATABASE_URL: safe };
    assert.equal(applyTestDatabaseUrl(allowed), safe);
    assert.equal(allowed.DATABASE_URL, safe);
  });
});

describe("cleanup guard", () => {
  const source = { TEST_DATABASE_URL: safe };

  it("refuses to treat crm_lab or another database as the cleanup target", async () => {
    await assert.rejects(() => assertConnectedTestDatabase(async () => "crm_lab", source), /crm_lab/);
    await assert.rejects(() => assertConnectedTestDatabase(async () => "production", source), /production/);
    await assert.rejects(() => assertConnectedTestDatabase(async () => "other_disposable", source), /other_disposable/);
  });

  it("accepts only the database named by TEST_DATABASE_URL", async () => {
    assert.equal(await assertConnectedTestDatabase(async () => "crm_phase32_test", source), "crm_phase32_test");
  });

  it("refuses a cleanup without a specific prefix and the dev server port", () => {
    assert.throws(() => assertCleanupPrefix("  "), /prefix/);
    assert.throws(() => assertCleanupPrefix("a"), /prefix/);
    assert.equal(assertCleanupPrefix(" [e2e] "), " [e2e] ");
    assert.throws(() => assertIsolatedE2EPort(3000), /3000/);
    assert.equal(assertIsolatedE2EPort(E2E_PORT), 3100);
  });
});

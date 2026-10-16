import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionCookieOptions, signSession, verifySession } from "../../src/lib/auth/session";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";

describe("signed sessions", () => {
  it("rejects a missing secret, a tampered token, and an expired token", async () => {
    const previous = process.env.CRM_LAB_SESSION_SECRET;
    process.env.CRM_LAB_SESSION_SECRET = "unit-test-session-secret-32chars-min";
    try {
      const token = signSession("user-1", 1_000);
      assert.equal(verifySession(token, 1_000), "user-1");
      assert.equal(verifySession(`${token}x`, 1_000), null);
      assert.equal(verifySession(token, 1_000 + 60 * 60 * 12 + 1), null);
      assert.equal(verifySession("crm-lab-user=demoadm", 1_000), null);
      delete process.env.CRM_LAB_SESSION_SECRET;
      assert.equal(verifySession(token, 1_000), null);
    } finally {
      if (previous === undefined) delete process.env.CRM_LAB_SESSION_SECRET;
      else process.env.CRM_LAB_SESSION_SECRET = previous;
    }
  });

  it("sets the Secure attribute only when CRM_LAB_COOKIE_SECURE is true", () => {
    const previous = process.env.CRM_LAB_COOKIE_SECURE;
    try {
      delete process.env.CRM_LAB_COOKIE_SECURE;
      assert.equal(sessionCookieOptions().secure, false);
      process.env.CRM_LAB_COOKIE_SECURE = "true";
      assert.equal(sessionCookieOptions().secure, true);
    } finally {
      if (previous === undefined) delete process.env.CRM_LAB_COOKIE_SECURE;
      else process.env.CRM_LAB_COOKIE_SECURE = previous;
    }
  });

  it("verifies a scrypt password and rejects a different one", async () => {
    const stored = await hashPassword("demoadm-pass");
    assert.equal(await verifyPassword("demoadm-pass", stored), true);
    assert.equal(await verifyPassword("other-pass", stored), false);
    assert.equal(await verifyPassword("demoadm-pass", "plaintext"), false);
  });
});

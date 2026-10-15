import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertTrustedOrigin, UntrustedOriginError } from "../../src/lib/auth/origin";

const url = "http://127.0.0.1:3100/api/accounts";
const request = (method: string, headers: Record<string, string> = {}, target = url) =>
  ({ method, headers: new Headers(headers), url: target }) as Pick<Request, "method" | "url" | "headers">;

describe("cookie mutation same-origin guard", () => {
  it("permits GET even if Origin points elsewhere", () => {
    assert.doesNotThrow(() => assertTrustedOrigin(request("GET", { origin: "https://evil.example" })));
  });

  it("permits same-origin browser writes", () => {
    assert.doesNotThrow(() => assertTrustedOrigin(request("PATCH", {
      origin: "http://127.0.0.1:3100", "sec-fetch-site": "same-origin",
    })));
  });

  it("rejects foreign origins, other ports, malformed origins and sibling subdomains", () => {
    for (const origin of ["https://evil.example", "http://127.0.0.1:3000", "null", "not-an-origin", "https://app.example.com.evil.example"]) {
      assert.throws(() => assertTrustedOrigin(request("POST", { origin })), UntrustedOriginError);
    }
    assert.throws(() => assertTrustedOrigin(request("POST", { origin: "https://sub.example.com" }, "https://example.com/api/notes")), UntrustedOriginError);
  });

  it("rejects cross-site and same-site Fetch Metadata even without Origin", () => {
    for (const site of ["cross-site", "same-site"]) {
      assert.throws(() => assertTrustedOrigin(request("POST", { "sec-fetch-site": site })), UntrustedOriginError);
    }
  });

  it("allows direct non-browser API clients with no Origin/Fetch Metadata", () => {
    assert.doesNotThrow(() => assertTrustedOrigin(request("POST")));
  });
});

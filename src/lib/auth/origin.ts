/**
 * CSRF origin guard for cookie-authenticated HTTP mutations.
 *
 * Browsers set Origin and/or Sec-Fetch-Site. Reject all cross-origin requests,
 * including sibling subdomains (same-site but not same-origin).
 * Requests without either header are allowed for CLI/Playwright API clients;
 * this is NOT a substitute for real authentication, HTTPS and deployment hardening.
 * Next.js Server Actions also have their own Origin validation.
 */
export class UntrustedOriginError extends Error {
  constructor() {
    super("Cross-origin write requests are not allowed.");
    this.name = "UntrustedOriginError";
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const assertTrustedOrigin = (request: Pick<Request, "method" | "url" | "headers">): void => {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin !== null) {
    try {
      if (new URL(origin).origin !== expected || new URL(origin).href !== `${expected}/`) {
        throw new UntrustedOriginError();
      }
    } catch {
      throw new UntrustedOriginError();
    }
  }
  // A same-site request may originate from an untrusted sibling subdomain.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new UntrustedOriginError();
  }
};

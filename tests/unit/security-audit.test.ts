import { describe, it, expect } from "vitest";
import { verifyCsrfToken, generateCsrfToken } from "@/src/auth/csrf";
import { ForbiddenError, NotFoundError } from "@/src/auth/errors";
import { GET as getCsrfRoute } from "@/app/api/csrf/route";
import { assertOwnership } from "@/src/auth/session";

describe("Phase 5: Security & CSRF Enforcement", () => {
  it("rejects x-test-skip-csrf when NODE_ENV is production", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // @ts-expect-error mutating for security test
      process.env.NODE_ENV = "production";

      const fakeReq = new Request("http://localhost/api/purchase-requests", {
        method: "POST",
        headers: {
          "x-test-skip-csrf": "true",
        },
      });

      // Must NOT allow bypass in production
      expect(() => verifyCsrfToken(fakeReq)).toThrow(ForbiddenError);
    } finally {
      // @ts-expect-error restore test env
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("issues fresh CSRF token and sets procurepilot_csrf cookie via GET /api/csrf", async () => {
    const res = await getCsrfRoute();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.csrfToken).toBeDefined();
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBe(48); // 24 bytes hex

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("procurepilot_csrf=");
  });

  it("validates double-submit cookie pattern on state mutations", () => {
    const token = generateCsrfToken();

    // 1. Matching token passes
    const validReq = new Request("http://localhost/api/purchase-requests", {
      method: "POST",
      headers: {
        "x-csrf-token": token,
        cookie: `procurepilot_csrf=${token}`,
      },
    });
    expect(() => verifyCsrfToken(validReq)).not.toThrow();

    // 2. Mismatched token fails
    const mismatchReq = new Request("http://localhost/api/purchase-requests", {
      method: "POST",
      headers: {
        "x-csrf-token": token,
        cookie: "procurepilot_csrf=different_attacker_token",
      },
    });
    expect(() => verifyCsrfToken(mismatchReq)).toThrow(ForbiddenError);
  });

  it("prevents IDOR and existence leaks by throwing NotFoundError on ownership mismatch", () => {
    expect(() => assertOwnership("usr_buyer_alice", "usr_buyer_alice")).not.toThrow();
    expect(() => assertOwnership("usr_buyer_alice", "usr_buyer_bob")).toThrow(NotFoundError);
  });
});


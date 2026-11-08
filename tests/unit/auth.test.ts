import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  assertOwnership,
} from "@/src/auth/session";
import { generateCsrfToken, verifyCsrfToken } from "@/src/auth/csrf";
import { NotFoundError, ForbiddenError } from "@/src/auth/errors";

describe("Authentication & Session Management", () => {
  it("creates and verifies a valid HMAC-signed session token", async () => {
    const user = {
      id: "usr_123",
      email: "buyer@procurepilot.demo",
      name: "Test Buyer",
    };

    const token = await createSessionToken(user);
    expect(token).toContain(".");

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe("usr_123");
    expect(verified?.email).toBe("buyer@procurepilot.demo");
  });

  it("rejects tampered session tokens", async () => {
    const user = {
      id: "usr_123",
      email: "buyer@procurepilot.demo",
    };

    const token = await createSessionToken(user);
    const tampered = token.slice(0, -4) + "AAAA";

    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });

  it("enforces resource ownership and throws NotFoundError on mismatch", () => {
    // Matching owner passes
    expect(() => assertOwnership("usr_1", "usr_1")).not.toThrow();

    // Mismatched owner throws NotFoundError (404) to avoid existence leaks
    expect(() => assertOwnership("usr_1", "usr_2")).toThrow(NotFoundError);
  });
});

describe("CSRF Protection", () => {
  it("generates cryptographically random hex CSRF tokens", () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).toHaveLength(48);
    expect(t2).toHaveLength(48);
    expect(t1).not.toBe(t2);
  });

  it("allows safe GET/HEAD methods without CSRF verification", () => {
    const getReq = new Request("http://localhost/api/test", { method: "GET" });
    expect(() => verifyCsrfToken(getReq)).not.toThrow();
  });

  it("rejects state-changing POST without CSRF token", () => {
    const postReq = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {},
    });
    expect(() => verifyCsrfToken(postReq)).toThrow(ForbiddenError);
  });

  it("accepts POST with matching CSRF cookie and header", () => {
    const token = generateCsrfToken();
    const postReq = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": token,
        cookie: `procurepilot_csrf=${token}`,
      },
    });
    expect(() => verifyCsrfToken(postReq)).not.toThrow();
  });
});


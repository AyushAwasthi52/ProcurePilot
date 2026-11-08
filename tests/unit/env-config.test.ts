import { describe, it, expect } from "vitest";
import { validateEnv } from "@/src/config/env";

describe("Environment Configuration & Zod Validation (Section 1)", () => {
  const baseValidEnv: Record<string, string> = {
    NODE_ENV: "development",
    APP_URL: "http://localhost:3000",
    AUTH_SECRET: "test-auth-secret-development-key",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    AI_PROVIDER: "mock",
    PAYMENTS_SIMULATED: "true",
  };

  it("validates valid development configuration successfully", () => {
    const config = validateEnv(baseValidEnv);
    expect(config.NODE_ENV).toBe("development");
    expect(config.APP_URL).toBe("http://localhost:3000");
    expect(config.DIRECT_URL).toBe(baseValidEnv.DATABASE_URL);
    expect(config.AI_PROVIDER).toBe("mock");
    expect(config.PAYMENTS_SIMULATED).toBe(true);
    expect(config.PLAN_TTL_SECONDS).toBe(600);
  });

  it("fails fast if required variables (e.g. AUTH_SECRET, DATABASE_URL) are missing", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        AUTH_SECRET: "",
      })
    ).toThrow(/AUTH_SECRET is required/);

    expect(() =>
      validateEnv({
        ...baseValidEnv,
        DATABASE_URL: "",
      })
    ).toThrow(/DATABASE_URL is required/);
  });

  it("enforces AUTH_SECRET >= 32 characters in production environments", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        NODE_ENV: "production",
        AUTH_SECRET: "short-secret-under-32-chars",
      })
    ).toThrow(/AUTH_SECRET must be at least 32 characters/);

    // 32+ characters in production passes
    const prodConfig = validateEnv({
      ...baseValidEnv,
      NODE_ENV: "production",
      AUTH_SECRET: "a-secure-production-secret-with-more-than-32-characters!",
    });
    expect(prodConfig.NODE_ENV).toBe("production");
  });

  it("enforces AI_API_KEY when AI_PROVIDER is set to gemini or openai", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        AI_PROVIDER: "gemini",
        AI_API_KEY: "",
      })
    ).toThrow(/AI_API_KEY is required/);

    const withApiKey = validateEnv({
      ...baseValidEnv,
      AI_PROVIDER: "gemini",
      AI_API_KEY: "test-gemini-key",
    });
    expect(withApiKey.AI_PROVIDER).toBe("gemini");
    expect(withApiKey.AI_API_KEY).toBe("test-gemini-key");
  });

  it("enforces PayPal credentials when PAYMENTS_SIMULATED is false in non-test mode", () => {
    expect(() =>
      validateEnv({
        ...baseValidEnv,
        NODE_ENV: "development",
        PAYMENTS_SIMULATED: "false",
        PAYPAL_CLIENT_ID: "",
      })
    ).toThrow(/PAYPAL_CLIENT_ID is required/);

    const withPayPal = validateEnv({
      ...baseValidEnv,
      NODE_ENV: "development",
      PAYMENTS_SIMULATED: "false",
      PAYPAL_CLIENT_ID: "client_id_123",
      PAYPAL_CLIENT_SECRET: "client_secret_456",
    });
    expect(withPayPal.PAYMENTS_SIMULATED).toBe(false);
    expect(withPayPal.PAYPAL_CLIENT_ID).toBe("client_id_123");
  });

  it("supports DIRECT_URL and falls back to DATABASE_URL when omitted", () => {
    const withDirect = validateEnv({
      ...baseValidEnv,
      DIRECT_URL: "postgresql://direct-host:5432/db",
    });
    expect(withDirect.DIRECT_URL).toBe("postgresql://direct-host:5432/db");

    const fallbackDirect = validateEnv(baseValidEnv);
    expect(fallbackDirect.DIRECT_URL).toBe(baseValidEnv.DATABASE_URL);
  });
});


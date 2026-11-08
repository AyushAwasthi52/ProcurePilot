import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import * as envConfig from "@/src/config/env";

describe("AI Provider Resilience & Fallback Engine", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("gracefully falls back to deterministic extraction when Gemini API returns 404 (model not found)", async () => {
    // Configure environment to request gemini
    vi.spyOn(envConfig, "getEnv").mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-auth-secret-development-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
      AI_PROVIDER: "gemini",
      AI_API_KEY: "mock_gemini_key",
      AI_MODEL: "gemini-1.5-flash",
      AI_MAX_COST_PER_REQUEST_USD: 0.25,
      PRODUCT_PROVIDER: "all",
      PROVIDER_MODE: "demo",
      PROVIDER_TIMEOUT_MS: 6000,
      OFFER_CACHE_TTL_SECONDS: 900,
      PLAN_TTL_SECONDS: 600,
      PAYPAL_ENV: "sandbox",
      PAYPAL_BASE_URL: "https://api-m.sandbox.paypal.com",
      PAYMENTS_SIMULATED: true,
      LOG_LEVEL: "info",
      SERPAPI_BASE_URL: "https://serpapi.com/search.json",
      EBAY_ENV: "production",
    });

    // Mock fetch to simulate Gemini 404
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({
        error: {
          code: 404,
          message: "models/gemini-1.5-flash is not found for API version v1beta",
          status: "NOT_FOUND",
        },
      }),
    } as unknown as Response);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Must not throw an unhandled internal server error!
    const result = await extractRequirementsFromPrompt("keyboard");

    expect(result.brief).toBeDefined();
    expect(result.brief.category).toBe("Keyboard");
    expect(result.brief.query).toBe("keyboard");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Falling back to deterministic offline extraction engine")
    );
  });

  it("gracefully falls back to deterministic extraction when Gemini API encounters network timeout", async () => {
    vi.spyOn(envConfig, "getEnv").mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-auth-secret-development-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
      AI_PROVIDER: "gemini",
      AI_API_KEY: "mock_gemini_key",
      AI_MODEL: "gemini-1.5-flash",
      AI_MAX_COST_PER_REQUEST_USD: 0.25,
      PRODUCT_PROVIDER: "all",
      PROVIDER_MODE: "demo",
      PROVIDER_TIMEOUT_MS: 6000,
      OFFER_CACHE_TTL_SECONDS: 900,
      PLAN_TTL_SECONDS: 600,
      PAYPAL_ENV: "sandbox",
      PAYPAL_BASE_URL: "https://api-m.sandbox.paypal.com",
      PAYMENTS_SIMULATED: true,
      LOG_LEVEL: "info",
      SERPAPI_BASE_URL: "https://serpapi.com/search.json",
      EBAY_ENV: "production",
    });

    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection reset"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await extractRequirementsFromPrompt("ergonomic office chair");

    expect(result.brief).toBeDefined();
    expect(result.brief.category).toBe("Furniture");
    expect(warnSpy).toHaveBeenCalled();
  });
});


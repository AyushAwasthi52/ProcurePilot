import { describe, it, expect } from "vitest";
import { SearchOrchestrator } from "@/src/discovery/search-orchestrator";
import { ProviderRegistry } from "@/src/providers/registry";
import { ProductProvider, ProviderSearchResult } from "@/src/providers/types";

describe("Universal Provider Orchestration & Provenance Truthfulness", () => {
  it("orchestrates searches across mixed live, demo, and unconfigured providers", async () => {
    const registry = new ProviderRegistry();
    registry.clear();

    // 1. Live provider: returns live offers with isDemo: false
    const mockLiveProvider: ProductProvider = {
      id: "serpapi_google_shopping",
      name: "Google Shopping",
      kind: "LIVE",
      isConfigured: () => true,
      search: async (): Promise<ProviderSearchResult> => ({
        providerId: "serpapi_google_shopping",
        offers: [
          {
            providerId: "serpapi_google_shopping",
            providerOfferId: "live_off_1",
            productTitle: "Live Real Mechanical Keyboard",
            merchantName: "Live Merchant",
            merchantId: "live_mer_1",
            price: { amountMinor: 7500, currency: "USD" },
            availability: "in_stock",
            productUrl: "https://real-merchant.example/kb",
            observedAt: new Date().toISOString(),
            isDemo: false,
            attributes: {},
          },
        ],
        latencyMs: 120,
      }),
      healthCheck: async () => ({ healthy: true, isConfigured: true, kind: "LIVE" }),
    };

    // 2. Demo provider: returns demo offers with isDemo: true
    const mockDemoProvider: ProductProvider = {
      id: "seeded_demo",
      name: "Seeded Demo Catalog",
      kind: "DEMO",
      isConfigured: () => true,
      search: async (): Promise<ProviderSearchResult> => ({
        providerId: "seeded_demo",
        offers: [
          {
            providerId: "seeded_demo",
            providerOfferId: "demo_off_1",
            productTitle: "Demo Keyboard Specimen",
            merchantName: "Demo Merchant",
            merchantId: "demo_mer_1",
            price: { amountMinor: 8500, currency: "USD" },
            availability: "in_stock",
            productUrl: "https://demo.example/kb",
            observedAt: new Date().toISOString(),
            isDemo: true,
            attributes: {},
          },
        ],
        latencyMs: 30,
      }),
      healthCheck: async () => ({ healthy: true, isConfigured: true, kind: "DEMO" }),
    };

    // 3. Unconfigured provider: isConfigured returns false
    const mockUnconfiguredProvider: ProductProvider = {
      id: "ebay_browse",
      name: "eBay Browse API",
      kind: "UNCONFIGURED",
      isConfigured: () => false,
      search: async (): Promise<ProviderSearchResult> => ({
        providerId: "ebay_browse",
        offers: [],
        latencyMs: 0,
      }),
      healthCheck: async () => ({ healthy: false, isConfigured: false, kind: "UNCONFIGURED" }),
    };

    registry.register(mockLiveProvider);
    registry.register(mockDemoProvider);
    registry.register(mockUnconfiguredProvider);

    const orchestrator = new SearchOrchestrator(registry);
    const result = await orchestrator.executeSearch(
      "run_mixed_123",
      "req_test_123",
      { query: "keyboard" }
    );

    // Status is PARTIAL or COMPLETE because all configured providers succeeded
    expect(["COMPLETE", "PARTIAL"]).toContain(result.status);
    expect(result.offers).toHaveLength(2);

    // Verify Provider Outcomes truthful status
    const outcomes = result.providerOutcomes;
    expect(outcomes.serpapi_google_shopping.status).toBe("COMPLETED");
    expect(outcomes.serpapi_google_shopping.kind).toBe("LIVE");
    expect(outcomes.serpapi_google_shopping.offerCount).toBe(1);

    expect(outcomes.seeded_demo.status).toBe("COMPLETED");
    expect(outcomes.seeded_demo.kind).toBe("DEMO");
    expect(outcomes.seeded_demo.offerCount).toBe(1);

    expect(outcomes.ebay_browse.status).toBe("UNCONFIGURED");
    expect(outcomes.ebay_browse.kind).toBe("UNCONFIGURED");
    expect(outcomes.ebay_browse.offerCount).toBe(0);

    // Verify offers have separated live vs demo provenance
    const liveOffer = result.offers.find((o) => o.providerId === "serpapi_google_shopping");
    expect(liveOffer).toBeDefined();

    const demoOffer = result.offers.find((o) => o.providerId === "seeded_demo");
    expect(demoOffer).toBeDefined();
  });

  it("handles multi-provider partial success when one provider fails or times out", async () => {
    const registry = new ProviderRegistry();
    registry.clear();

    const mockWorkingProvider: ProductProvider = {
      id: "provider_good",
      name: "Good Provider",
      kind: "LIVE",
      isConfigured: () => true,
      search: async (): Promise<ProviderSearchResult> => ({
        providerId: "provider_good",
        offers: [
          {
            providerId: "provider_good",
            providerOfferId: "good_1",
            productTitle: "Good Product",
            merchantName: "Good Merchant",
            price: { amountMinor: 5000, currency: "USD" },
            availability: "in_stock",
            productUrl: "https://good.example",
            observedAt: new Date().toISOString(),
            attributes: {},
          },
        ],
        latencyMs: 50,
      }),
      healthCheck: async () => ({ healthy: true, isConfigured: true, kind: "LIVE" }),
    };

    const mockFailingProvider: ProductProvider = {
      id: "provider_fail",
      name: "Failing Provider",
      kind: "LIVE",
      isConfigured: () => true,
      search: async (): Promise<ProviderSearchResult> => {
        throw new Error("503 Service Unavailable");
      },
      healthCheck: async () => ({ healthy: false, isConfigured: true, kind: "LIVE" }),
    };

    registry.register(mockWorkingProvider);
    registry.register(mockFailingProvider);

    const orchestrator = new SearchOrchestrator(registry);
    const result = await orchestrator.executeSearch(
      "run_partial_123",
      "req_test_partial",
      { query: "keyboard" }
    );

    expect(result.status).toBe("PARTIAL");
    expect(result.offers).toHaveLength(1);
    expect(result.providerOutcomes.provider_good.status).toBe("COMPLETED");
    expect(result.providerOutcomes.provider_fail.status).toBe("FAILED");
    expect(result.providerOutcomes.provider_fail.error).toContain("503 Service Unavailable");
  });
});

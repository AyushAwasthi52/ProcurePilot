import { describe, it, expect } from "vitest";
import { CatalogProviderAAdapter } from "@/src/providers/provider-a/adapter";
import { CatalogProviderBAdapter } from "@/src/providers/provider-b/adapter";
import { SeededDemoCatalogAdapter } from "@/src/providers/seeded/adapter";
import { SearchOrchestrator } from "@/src/discovery/search-orchestrator";
import { ProviderRegistry } from "@/src/providers/registry";

describe("Phase 2: Truthful Provider Capabilities & Fixture Transparency", () => {
  it("marks all offers from SeededDemoCatalogAdapter with isDemo: true", async () => {
    const adapter = new SeededDemoCatalogAdapter();
    expect(adapter.kind).toBe("DEMO");
    expect(adapter.isConfigured()).toBe(true);

    const abort = new AbortController();
    const result = await adapter.search({ query: "laptop" }, abort.signal);

    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.isDemo === true)).toBe(true);
  });

  it("marks all fixture offers from Provider A with isDemo: true in demo mode", async () => {
    const adapter = new CatalogProviderAAdapter({ mode: "demo" });
    expect(adapter.kind).toBe("DEMO");
    expect(adapter.isConfigured()).toBe(true);

    const abort = new AbortController();
    const result = await adapter.search({ query: "laptop" }, abort.signal);

    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.isDemo === true)).toBe(true);
  });

  it("marks all fixture offers from Provider B with isDemo: true in demo mode", async () => {
    const adapter = new CatalogProviderBAdapter({ mode: "demo" });
    expect(adapter.kind).toBe("DEMO");
    expect(adapter.isConfigured()).toBe(true);

    const abort = new AbortController();
    const result = await adapter.search({ query: "headphones" }, abort.signal);

    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.isDemo === true)).toBe(true);
  });

  it("marks provider as UNCONFIGURED and does not claim healthy when live credentials are missing", async () => {
    const unconfiguredA = new CatalogProviderAAdapter({ mode: "live" });
    expect(unconfiguredA.isConfigured()).toBe(false);
    expect(unconfiguredA.kind).toBe("UNCONFIGURED");

    const health = await unconfiguredA.healthCheck();
    expect(health.healthy).toBe(false);
    expect(health.isConfigured).toBe(false);
    expect(health.kind).toBe("UNCONFIGURED");

    // Search throws rather than fabricating live data
    const abort = new AbortController();
    await expect(unconfiguredA.search({ query: "laptop" }, abort.signal)).rejects.toThrow(
      "Provider A is unconfigured"
    );
  });

  it("orchestrates search runs with explicit distinction between DEMO, UNCONFIGURED, and TIMED_OUT", async () => {
    const registry = new ProviderRegistry();
    registry.clear();

    const seededAdapter = new SeededDemoCatalogAdapter();
    const unconfiguredAdapter = new CatalogProviderAAdapter({ mode: "live" }); // Missing credentials
    const timingOutAdapter = new CatalogProviderBAdapter({ mode: "demo", shouldTimeout: true });

    registry.register(seededAdapter);
    registry.register(unconfiguredAdapter);
    registry.register(timingOutAdapter);

    const orchestrator = new SearchOrchestrator(registry);
    const runResult = await orchestrator.executeSearch(
      `run_truth_test_${Date.now()}`,
      "req_truth_test",
      { query: "laptop" },
      undefined,
      150 // Short 150ms timeout for test
    );

    // 1. Seeded provider outcome is COMPLETED and DEMO
    expect(runResult.providerOutcomes["seeded_demo"].status).toBe("COMPLETED");
    expect(runResult.providerOutcomes["seeded_demo"].kind).toBe("DEMO");

    // 2. Unconfigured provider outcome is UNCONFIGURED
    expect(runResult.providerOutcomes["provider_a"].status).toBe("UNCONFIGURED");
    expect(runResult.providerOutcomes["provider_a"].kind).toBe("UNCONFIGURED");

    // 3. Timing out provider outcome is TIMED_OUT
    expect(runResult.providerOutcomes["provider_b"].status).toBe("TIMED_OUT");
    expect(runResult.providerOutcomes["provider_b"].kind).toBe("DEMO");

    // Partial success overall since seeded completed
    expect(runResult.status).toBe("PARTIAL");
    expect(runResult.offers.length).toBeGreaterThan(0);
    expect(runResult.offers.every((o) => o.isDemo === true)).toBe(true);
  });
});


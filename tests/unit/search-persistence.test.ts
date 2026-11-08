import { describe, it, expect } from "vitest";
import { SearchOrchestrator, searchOrchestrator } from "@/src/discovery/search-orchestrator";
import { ProviderRegistry } from "@/src/providers/registry";
import { SeededDemoCatalogAdapter } from "@/src/providers/seeded/adapter";
import { CatalogProviderBAdapter } from "@/src/providers/provider-b/adapter";
import { GET as getSearchRunRoute } from "@/app/api/purchase-requests/[id]/search/route";
import { NextRequest } from "next/server";
import { createPurchaseRequest } from "@/src/db/queries/purchase-requests";

describe("Phase 4: Search Orchestration, Persistence & Lifecycle", () => {
  it("preserves successful offers even when another provider fails or times out", async () => {
    const registry = new ProviderRegistry();
    registry.clear();

    const goodProvider = new SeededDemoCatalogAdapter();
    const failingProvider = new CatalogProviderBAdapter({ mode: "demo", shouldTimeout: true });

    registry.register(goodProvider);
    registry.register(failingProvider);

    const orchestrator = new SearchOrchestrator(registry);
    const result = await orchestrator.executeSearch(
      `run_partial_${Date.now()}`,
      "req_partial_test",
      { query: "laptop" },
      undefined,
      120 // 120ms timeout
    );

    expect(result.status).toBe("PARTIAL");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.providerOutcomes["seeded_demo"].status).toBe("COMPLETED");
    expect(result.providerOutcomes["provider_b"].status).toBe("TIMED_OUT");
  });

  it("distinguishes zero results from total provider failure", async () => {
    const registry = new ProviderRegistry();
    registry.clear();

    const goodProvider = new SeededDemoCatalogAdapter();
    registry.register(goodProvider);

    const orchestrator = new SearchOrchestrator(registry);
    const zeroResultsRun = await orchestrator.executeSearch(
      `run_zero_${Date.now()}`,
      "req_zero_test",
      { query: "nonexistent item 987654321xyz" }
    );

    // Provider succeeded, but returned 0 offers -> COMPLETE with 0 offers, NOT FAILED
    expect(zeroResultsRun.status).toBe("COMPLETE");
    expect(zeroResultsRun.offers.length).toBe(0);
    expect(zeroResultsRun.providerOutcomes["seeded_demo"].status).toBe("COMPLETED");
    expect(zeroResultsRun.providerOutcomes["seeded_demo"].offerCount).toBe(0);
  });

  it("retrieves completed search run for purchase request via GET search endpoint", async () => {
    const userReq = await createPurchaseRequest({
      userId: "usr_demo_buyer",
      rawPrompt: "Over-ear ANC headphones under $350",
      region: "US",
      currency: "USD",
    });

    const runId = `run_persist_${Date.now()}`;
    await searchOrchestrator.executeSearch(runId, userReq.id, { query: "headphones" });

    // Test GET /api/purchase-requests/[id]/search
    const getReq = new NextRequest(
      `http://localhost/api/purchase-requests/${userReq.id}/search`
    );

    const res = await getSearchRunRoute(getReq, {
      params: Promise.resolve({ id: userReq.id }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requestId).toBe(userReq.id);
    expect(body.status).toBeDefined();
    expect(body.providerOutcomes).toBeDefined();
  });
});

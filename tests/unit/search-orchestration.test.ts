import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { searchOrchestrator, SearchOrchestrator } from "@/src/discovery/search-orchestrator";
import { ProviderRegistry } from "@/src/providers/registry";
import { SeededDemoCatalogAdapter } from "@/src/providers/seeded/adapter";
import { CatalogProviderAAdapter } from "@/src/providers/provider-a/adapter";
import { CatalogProviderBAdapter } from "@/src/providers/provider-b/adapter";
import { createSessionToken } from "@/src/auth/session";
import { POST as searchRoute } from "@/app/api/purchase-requests/[id]/search/route";
import { GET as getSearchRun } from "@/app/api/search-runs/[id]/route";
import { POST as cancelSearchRun } from "@/app/api/search-runs/[id]/cancel/route";
import { createPurchaseRequest } from "@/src/db/queries/purchase-requests";

describe("Search Orchestration & Multi-Provider Discovery", () => {
  beforeEach(() => {
    searchOrchestrator.clear();
  });

  it("orchestrates parallel provider search and aggregates normalized offers", async () => {
    const result = await searchOrchestrator.executeSearch(
      "run_test_1",
      "req_123",
      { query: "laptop" }
    );

    expect(result.status).toBe("COMPLETE");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.providerOutcomes.seeded_demo.status).toBe("COMPLETED");
    expect(result.providerOutcomes.provider_a.status).toBe("COMPLETED");
  });

  it("handles partial failure gracefully when one provider times out (FR-003, NFR-02)", async () => {
    // Custom registry with a failing / timing-out provider
    const customRegistry = new ProviderRegistry();
    customRegistry.register(new SeededDemoCatalogAdapter());
    customRegistry.register(new CatalogProviderAAdapter());
    // Provider B set to timeout
    customRegistry.register(new CatalogProviderBAdapter({ shouldTimeout: true }));

    const customOrchestrator = new SearchOrchestrator(customRegistry);

    const result = await customOrchestrator.executeSearch(
      "run_test_partial",
      "req_123",
      { query: "laptop" },
      undefined,
      50 // 50ms timeout for test
    );

    // Status must be PARTIAL, not FAILED; healthy providers must be kept
    expect(result.status).toBe("PARTIAL");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.providerOutcomes.provider_b.status).toBe("TIMED_OUT");
    expect(result.providerOutcomes.seeded_demo.status).toBe("COMPLETED");
  });

  it("cancels running search when requested (FR-015)", async () => {
    const runPromise = searchOrchestrator.executeSearch(
      "run_test_cancel",
      "req_123",
      { query: "laptop" }
    );

    // Cancel while in-flight
    const didCancel = searchOrchestrator.cancelSearch("run_test_cancel");
    expect(didCancel).toBe(true);

    const result = await runPromise;
    expect(result.status).toBe("CANCELLED");
  });

  it("integrates search endpoints: launch, status check, and cancellation", async () => {
    const userAlice = { id: "usr_alice", email: "alice@example.com" };
    const sessionAlice = await createSessionToken(userAlice);

    const purchaseRequest = await createPurchaseRequest({
      userId: userAlice.id,
      rawPrompt: "A high performance laptop for ML experiments",
    });

    // 1. Launch search via POST /api/purchase-requests/:id/search
    const searchReq = new NextRequest(
      `http://localhost:3000/api/purchase-requests/${purchaseRequest.id}/search`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
          "x-sync-search": "true", // Synchronous return for testing
        },
      }
    );

    const searchRes = await searchRoute(searchReq, {
      params: Promise.resolve({ id: purchaseRequest.id }),
    });
    expect(searchRes.status).toBe(201);
    const searchData = await searchRes.json();
    expect(searchData).toHaveProperty("runId");
    expect(searchData.offers.length).toBeGreaterThan(0);

    // 2. Query search run via GET /api/search-runs/:id
    const getReq = new NextRequest(
      `http://localhost:3000/api/search-runs/${searchData.runId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${sessionAlice}`,
        },
      }
    );

    const getRes = await getSearchRun(getReq, {
      params: Promise.resolve({ id: searchData.runId }),
    });
    expect(getRes.status).toBe(200);
    const runDetails = await getRes.json();
    expect(runDetails.runId).toBe(searchData.runId);

    // 3. Cancel search run via POST /api/search-runs/:id/cancel
    const cancelReq = new NextRequest(
      `http://localhost:3000/api/search-runs/${searchData.runId}/cancel`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
        },
      }
    );

    const cancelRes = await cancelSearchRun(cancelReq, {
      params: Promise.resolve({ id: searchData.runId }),
    });
    expect(cancelRes.status).toBe(200);
  });
});

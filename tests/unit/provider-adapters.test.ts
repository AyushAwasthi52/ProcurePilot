import { describe, it, expect } from "vitest";
import { SeededDemoCatalogAdapter } from "@/src/providers/seeded/adapter";
import { CatalogProviderAAdapter } from "@/src/providers/provider-a/adapter";

describe("Product Provider Adapters", () => {
  it("SeededDemoCatalogAdapter returns candidate offers with demo flag", async () => {
    const adapter = new SeededDemoCatalogAdapter();
    const controller = new AbortController();

    const result = await adapter.search(
      { query: "laptop" },
      controller.signal
    );

    expect(result.providerId).toBe("seeded_demo");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.isDemo === true)).toBe(true);

    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
  });

  it("CatalogProviderAAdapter returns live-like normalized offers", async () => {
    const adapter = new CatalogProviderAAdapter();
    const controller = new AbortController();

    const result = await adapter.search(
      { query: "laptop" },
      controller.signal
    );

    expect(result.providerId).toBe("provider_a");
    expect(result.offers.length).toBeGreaterThan(0);
    const brightline = result.offers.find((o) => o.merchantName === "Brightline Electronics");
    expect(brightline).toBeDefined();
    expect(brightline?.price.amountMinor).toBe(164900);
  });

  it("respects AbortSignal and aborts immediately when cancelled", async () => {
    const adapter = new CatalogProviderAAdapter();
    const controller = new AbortController();
    controller.abort(); // Pre-aborted

    await expect(
      adapter.search({ query: "laptop" }, controller.signal)
    ).rejects.toThrow("Search aborted by user");
  });
});


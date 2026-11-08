import { describe, it, expect } from "vitest";
import {
  normalizeProviderOffer,
  deduplicateOffers,
  generateCanonicalKey,
  formatFreshnessLabel,
} from "@/src/domain/catalog/normalizer";
import { ProviderOffer } from "@/src/providers/types";

describe("Catalog Normalizer & Deduplicator", () => {
  const sampleOffer: ProviderOffer = {
    providerId: "provider_a",
    providerOfferId: "ofr_test_123",
    productTitle: "Halden Vector 16",
    brand: "Halden",
    category: "Laptop",
    attributes: {
      ramGb: 32,
      warrantyMonths: 36,
    },
    merchantName: "Brightline Electronics",
    merchantId: "mer_brightline",
    price: {
      amountMinor: 164900,
      currency: "USD",
    },
    shipping: {
      status: "KNOWN",
      amountMinor: 0,
      currency: "USD",
    },
    availability: "in_stock",
    productUrl: "https://brightline.example/item",
    observedAt: new Date().toISOString(),
  };

  it("normalizes provider offer to canonical schema with integer minor units", () => {
    const normalized = normalizeProviderOffer(sampleOffer);
    expect(normalized.productTitle).toBe("Halden Vector 16");
    expect(normalized.priceMinor).toBe(164900);
    expect(normalized.currency).toBe("USD");
    expect(normalized.totalKnownMinor).toBe(164900);
    expect(normalized.shippingStatus).toBe("KNOWN");
    expect(normalized.shippingMinor).toBe(0);
    expect(normalized.warrantyMonths).toBe(36);
  });

  it("assigns HANDOFF_ONLY to third-party merchants and DEMO_PAYPAL to demo store", () => {
    const brightline = normalizeProviderOffer(sampleOffer);
    expect(brightline.checkoutCapability).toBe("HANDOFF_ONLY");

    const demoStoreOffer: ProviderOffer = {
      ...sampleOffer,
      merchantId: "mer_demo_store",
      merchantName: "ProcurePilot Demo Store (sandbox)",
    };
    const demo = normalizeProviderOffer(demoStoreOffer);
    expect(demo.checkoutCapability).toBe("DEMO_PAYPAL");
  });

  it("computes total known cost excluding unknown shipping and tax", () => {
    const unknownShippingOffer: ProviderOffer = {
      ...sampleOffer,
      shipping: {
        status: "UNKNOWN",
      },
    };
    const normalized = normalizeProviderOffer(unknownShippingOffer);
    expect(normalized.shippingStatus).toBe("UNKNOWN");
    expect(normalized.shippingMinor).toBeNull();
    // Does not assume 0 for unknown shipping
    expect(normalized.totalKnownMinor).toBe(164900);
  });

  it("deduplicates identical offers across providers", () => {
    const o1 = normalizeProviderOffer(sampleOffer);
    const o2 = normalizeProviderOffer(sampleOffer);
    const deduplicated = deduplicateOffers([o1, o2]);
    expect(deduplicated).toHaveLength(1);
  });

  it("generates deterministic canonical product keys", () => {
    const key1 = generateCanonicalKey("Halden", "Vector 16 (2024)");
    const key2 = generateCanonicalKey("Halden", "Vector 16 - 2024");
    expect(key1).toBe("halden-vector-16-2024");
    expect(key2).toBe("halden-vector-16-2024");
  });

  it("formats freshness labels cleanly", () => {
    const fresh = new Date(Date.now() - 15 * 1000); // 15 seconds ago
    expect(formatFreshnessLabel(fresh)).toContain("refreshed 15s ago");

    const older = new Date(Date.now() - 3 * 60 * 1000); // 3 minutes ago
    expect(formatFreshnessLabel(older)).toBe("refreshed 3 min ago");
  });
});


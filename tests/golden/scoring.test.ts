import { describe, it, expect } from "vitest";
import {
  calculateScoreBreakdown,
  compareRankedOffers,
  ScoreComponents,
} from "@/src/domain/scoring/model";
import { NormalizedOffer } from "@/src/domain/catalog/types";

describe("Golden Scoring Regression Suite (Section 6.4 & 14.4)", () => {
  it("matches worked example with all 5 components known", () => {
    const components: ScoreComponents = {
      requirementFit: 92,
      performancePerDollar: 84,
      priceAttractiveness: 71,
      sellerConfidence: 88,
      ownershipValue: 90,
    };

    const result = calculateScoreBreakdown(components, 0);

    // Exact values from documentation:
    // 0.35*92 + 0.25*84 + 0.15*71 + 0.15*88 + 0.10*90
    // = 32.2 + 21.0 + 10.65 + 13.2 + 9.0 = 86.05
    expect(result.totalScore).toBe(86.05);
    expect(result.displayedScore).toBe(86);
    expect(result.completeness).toBe(1.0);
    expect(result.confidence).toBe("HIGH");

    // Component point breakdown check
    expect(result.points.requirementFit).toBe(32.2);
    expect(result.points.performancePerDollar).toBe(21.0);
    expect(result.points.priceAttractiveness).toBe(10.65);
    expect(result.points.sellerConfidence).toBe(13.2);
    expect(result.points.ownershipValue).toBe(9.0);
  });

  it("matches worked example with price attractiveness unavailable", () => {
    const components: ScoreComponents = {
      requirementFit: 92,
      performancePerDollar: 84,
      priceAttractiveness: undefined, // missing / insufficient history
      sellerConfidence: 88,
      ownershipValue: 90,
    };

    const result = calculateScoreBreakdown(components, 0);

    // Sum of points = 32.2 + 21.0 + 13.2 + 9.0 = 75.4
    // Known weights = 35 + 25 + 15 + 10 = 85 (0.85)
    // 75.4 / 0.85 = 88.7058... -> 88.71
    expect(result.totalScore).toBe(88.71);
    expect(result.displayedScore).toBe(89);
    expect(result.completeness).toBe(0.85);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("downgrades confidence to MEDIUM if exactly one must-have is UNVERIFIED", () => {
    const components: ScoreComponents = {
      requirementFit: 92,
      performancePerDollar: 84,
      priceAttractiveness: 71,
      sellerConfidence: 88,
      ownershipValue: 90,
    };

    // 1 unverified must-have
    const result = calculateScoreBreakdown(components, 1);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("applies deterministic 5-step tie-breaker", () => {
    const baseOffer: NormalizedOffer = {
      id: "ofr_b",
      productId: "prod_1",
      productTitle: "Test Laptop",
      productBrand: "Brand",
      productCategory: "Laptop",
      providerId: "seeded",
      merchantId: "mer_1",
      merchantName: "Merchant 1",
      url: "https://example.com",
      priceMinor: 164900,
      currency: "USD",
      shippingStatus: "KNOWN",
      shippingMinor: 0,
      taxStatus: "UNKNOWN",
      taxMinor: null,
      totalKnownMinor: 164900,
      availability: "in_stock",
      checkoutCapability: "HANDOFF_ONLY",
      attributes: {},
      sourceObservedAt: new Date("2026-11-08T00:00:00Z"),
      ingestedAt: new Date(),
      isDemo: true,
    };

    const candA = {
      offer: { ...baseOffer, id: "ofr_a" },
      score: calculateScoreBreakdown({
        requirementFit: 90,
        performancePerDollar: 80,
        sellerConfidence: 80,
        ownershipValue: 80,
      }),
    };

    const candB = {
      offer: { ...baseOffer, id: "ofr_b" },
      score: calculateScoreBreakdown({
        requirementFit: 90,
        performancePerDollar: 80,
        sellerConfidence: 80,
        ownershipValue: 80,
      }),
    };

    // Equal scores -> tie broken by offer ID lexicographically (ofr_a comes before ofr_b)
    const order = [candB, candA].sort(compareRankedOffers);
    expect(order[0].offer.id).toBe("ofr_a");
    expect(order[1].offer.id).toBe("ofr_b");
  });
});

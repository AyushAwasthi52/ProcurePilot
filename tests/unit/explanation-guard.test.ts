import { describe, it, expect } from "vitest";
import {
  verifyExplanationAgainstFacts,
  getGuardedExplanation,
  RecommendationFacts,
} from "@/src/domain/scoring/explanation-guard";
import { calculateScoreBreakdown } from "@/src/domain/scoring/model";
import { NormalizedOffer } from "@/src/domain/catalog/types";

describe("Explanation Guard (Section 6.8)", () => {
  const offer: NormalizedOffer = {
    id: "ofr_1",
    productId: "prod_1",
    productTitle: "Halden Vector 16",
    productBrand: "Halden",
    productCategory: "Laptop",
    providerId: "seeded",
    merchantId: "mer_1",
    merchantName: "Brightline Electronics",
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
    warrantyMonths: 36,
    attributes: {
      ramGb: 32,
      thermalsScore: 92,
    },
    sourceObservedAt: new Date(),
    ingestedAt: new Date(),
    isDemo: true,
  };

  const facts: RecommendationFacts = {
    recommendedOffer: offer,
    score: calculateScoreBreakdown({
      requirementFit: 92,
      performancePerDollar: 84,
      sellerConfidence: 88,
      ownershipValue: 90,
    }),
    costGapMinor: 17000, // $170 gap
  };

  it("approves factually consistent explanation", () => {
    const validText =
      "Halden Vector 16 is recommended. It costs $1,649 and has a 36-month warranty.";
    const approved = verifyExplanationAgainstFacts(validText, facts);
    expect(approved).toBe(true);
  });

  it("rejects explanation containing hallucinated dollar amounts", () => {
    // $999 is hallucinated (does not match 1649 or 170)
    const hallucinatedText =
      "Halden Vector 16 is on a massive discount for only $999!";
    const approved = verifyExplanationAgainstFacts(hallucinatedText, facts);
    expect(approved).toBe(false);

    // Fallback template is returned instead
    const guarded = getGuardedExplanation(hallucinatedText, facts);
    expect(guarded).toContain("Highest requirement fit");
    expect(guarded).not.toContain("$999");
  });

  it("generates faithful template explanation citing verified specs and price gap", () => {
    const template = getGuardedExplanation(undefined, facts);
    expect(template).toContain("32 GB RAM");
    expect(template).toContain("36-month warranty");
    expect(template).toContain("92");
    expect(template).toContain("$170");
  });
});


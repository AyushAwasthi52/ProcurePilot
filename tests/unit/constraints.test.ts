import { describe, it, expect } from "vitest";
import {
  evaluateConstraint,
  evaluateOfferConstraints,
} from "@/src/domain/scoring/constraints";
import { MustHaveConstraint, Budget } from "@/src/ai/schemas/brief";
import { NormalizedOffer } from "@/src/domain/catalog/types";

describe("Tri-State Constraint Evaluation (Section 6.3, FR-016)", () => {
  const baseOffer: NormalizedOffer = {
    id: "ofr_1",
    productId: "prod_1",
    productTitle: "Vector 16",
    productBrand: "Halden",
    productCategory: "Laptop",
    providerId: "seeded",
    merchantId: "mer_1",
    merchantName: "Brightline",
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
    attributes: {
      ramGb: 32,
      ramUpgradeable: true,
      warrantyMonths: 36,
    },
    sourceObservedAt: new Date(),
    ingestedAt: new Date(),
    isDemo: true,
  };

  const budget: Budget = {
    amountMinor: 180000,
    currency: "USD",
    includesShipping: true,
  };

  it("returns PASS when attribute is present and meets constraint", () => {
    const constraint: MustHaveConstraint = {
      attribute: "warrantyMonths",
      operator: "gte",
      value: 24,
      confirmed: true,
      provenance: "you-said",
    };

    const res = evaluateConstraint(constraint, baseOffer);
    expect(res.status).toBe("PASS");
  });

  it("returns FAIL when attribute is present but fails constraint", () => {
    const constraint: MustHaveConstraint = {
      attribute: "warrantyMonths",
      operator: "gte",
      value: 48, // 36 < 48
      confirmed: true,
      provenance: "you-said",
    };

    const res = evaluateConstraint(constraint, baseOffer);
    expect(res.status).toBe("FAIL");
  });

  it("returns UNVERIFIED when attribute is missing or null", () => {
    const offerWithoutWarranty: NormalizedOffer = {
      ...baseOffer,
      attributes: {
        ramGb: 32,
      },
    };

    const constraint: MustHaveConstraint = {
      attribute: "warrantyMonths",
      operator: "gte",
      value: 24,
      confirmed: true,
      provenance: "you-said",
    };

    const res = evaluateConstraint(constraint, offerWithoutWarranty);
    expect(res.status).toBe("UNVERIFIED");
    expect(res.actual).toBeNull();
  });

  it("flags budget constraint accurately: PASS, FAIL (over-budget), UNVERIFIED (unknown shipping)", () => {
    // 1. Within budget
    const passResult = evaluateOfferConstraints([], budget, baseOffer);
    expect(passResult.eligible).toBe(true);
    expect(passResult.isOverBudget).toBe(false);
    expect(passResult.results.budget).toBe("PASS");

    // 2. Over budget (item price > budget)
    const overOffer: NormalizedOffer = {
      ...baseOffer,
      priceMinor: 214900,
      totalKnownMinor: 214900,
    };
    const failResult = evaluateOfferConstraints([], budget, overOffer);
    expect(failResult.eligible).toBe(false);
    expect(failResult.isOverBudget).toBe(true);
    expect(failResult.results.budget).toBe("FAIL");

    // 3. Unknown shipping
    const unknownShippingOffer: NormalizedOffer = {
      ...baseOffer,
      shippingStatus: "UNKNOWN",
      shippingMinor: null,
    };
    const unverifiedResult = evaluateOfferConstraints([], budget, unknownShippingOffer);
    expect(unverifiedResult.results.budget).toBe("UNVERIFIED");
    expect(unverifiedResult.hasUnverified).toBe(true);
  });
});


import { describe, it, expect } from "vitest";
import { PurchaseBriefSchema, PurchaseBrief } from "@/src/ai/schemas/brief";

describe("PurchaseBrief Schema v3 Validation", () => {
  const validBrief: PurchaseBrief = {
    category: "Laptop",
    query: "Laptop for ML experiments",
    useCases: ["Programming", "ML experiments"],
    budget: {
      amountMinor: 180000,
      currency: "USD",
      includesShipping: true,
    },
    mustHave: [
      {
        attribute: "warrantyMonths",
        operator: "gte",
        value: 24,
        confirmed: true,
        provenance: "you-said",
        label: "Warranty ≥ 24 months",
      },
    ],
    preferences: [
      { attribute: "thermals", label: "Thermals", weight: 30 },
      { attribute: "upgradeability", label: "Upgradeability", weight: 25 },
    ],
    region: "US",
    quantity: 1,
    urgency: "normal",
    assumptions: [
      { field: "category", value: "Laptop", origin: "inferred" },
    ],
    schemaVersion: 3,
  };

  it("validates compliant PurchaseBrief object", () => {
    const parsed = PurchaseBriefSchema.parse(validBrief);
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.budget.amountMinor).toBe(180000);
    expect(parsed.mustHave).toHaveLength(1);
  });

  it("rejects non-integer minor unit amounts", () => {
    const invalid = {
      ...validBrief,
      budget: {
        ...validBrief.budget,
        amountMinor: 1800.5,
      },
    };
    expect(() => PurchaseBriefSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid currency codes", () => {
    const invalid = {
      ...validBrief,
      budget: {
        ...validBrief.budget,
        currency: "US", // Needs 3 chars
      },
    };
    expect(() => PurchaseBriefSchema.parse(invalid)).toThrow();
  });

  it("rejects negative quantity", () => {
    const invalid = {
      ...validBrief,
      quantity: 0,
    };
    expect(() => PurchaseBriefSchema.parse(invalid)).toThrow();
  });
});

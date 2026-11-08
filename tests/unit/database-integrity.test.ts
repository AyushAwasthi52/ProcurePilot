import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createPurchaseRequest,
  getPurchaseRequestById,
  mapDatabaseRowToPurchaseBrief,
  clearInMemoryStore,
} from "@/src/db/queries/purchase-requests";
import { db } from "@/src/db/client";
import { DatabaseUnavailableError } from "@/src/auth/errors";
import { evaluateOfferConstraints } from "@/src/domain/scoring/constraints";
import { evaluateAndRankOffers } from "@/src/domain/scoring/evaluator";
import { NormalizedOffer } from "@/src/domain/catalog/types";

describe("Phase 2: Database and Brief Integrity Suite", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearInMemoryStore();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("1. never fabricates an in-memory record on database failure in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    vi.spyOn(db.purchaseRequest, "create").mockRejectedValueOnce(
      new Error("Postgres connection terminated unexpectedly")
    );

    await expect(
      createPurchaseRequest({
        userId: "usr_prod_test",
        rawPrompt: "4k monitor for home office",
      })
    ).rejects.toThrow(DatabaseUnavailableError);
  });

  it("2. distinguishes database connection failure from record-not-found in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    // A. Record truly does not exist in DB: returns null (maps to 404)
    vi.spyOn(db.purchaseRequest, "findUnique").mockResolvedValueOnce(null);
    const notFound = await getPurchaseRequestById("req_nonexistent_123");
    expect(notFound).toBeNull();

    // B. Database connection fails: throws DatabaseUnavailableError (maps to 503)
    vi.spyOn(db.purchaseRequest, "findUnique").mockRejectedValueOnce(
      new Error("Connection pool timeout")
    );
    await expect(getPurchaseRequestById("req_valid_456")).rejects.toThrow(
      DatabaseUnavailableError
    );
  });

  it("3. validates reconstructed briefs strictly and never bypasses invalid schemas", () => {
    // A. Valid database brief parses cleanly
    const validRow = {
      category: "Laptop",
      query: "laptop for coding",
      useCases: ["development"],
      budgetMinor: 150000,
      budgetCurrency: "USD",
      includesShipping: true,
      mustHave: [],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal",
      assumptions: [],
    };
    const validResult = mapDatabaseRowToPurchaseBrief(validRow);
    expect(validResult).not.toBeNull();
    expect(validResult?.category).toBe("Laptop");
    expect(validResult?.budget.amountMinor).toBe(150000);

    // B. Legacy row with malformed constraint objects is sanitized
    const legacyRowWithDirtyConstraints = {
      category: "Keyboard",
      query: "wireless keyboard",
      useCases: "[\"typing\"]", // Stringified JSON
      budgetMinor: 8000,
      budgetCurrency: "USD",
      includesShipping: true,
      mustHave: [
        { attribute: "wireless", operator: "eq", value: true, confirmed: true, provenance: "you-said" },
        { invalidField: true, attribute: 123 }, // Corrupt constraint
      ],
      preferences: [],
      assumptions: [],
    };
    const sanitizedResult = mapDatabaseRowToPurchaseBrief(legacyRowWithDirtyConstraints);
    expect(sanitizedResult).not.toBeNull();
    // Only valid constraints are preserved
    expect(sanitizedResult?.mustHave.length).toBe(1);
    expect(sanitizedResult?.mustHave[0].attribute).toBe("wireless");

    // C. Irreparably invalid row (e.g. empty category, invalid currency) returns null, never bypasses
    const irreparablyBrokenRow = {
      category: "", // Invalid min(1) constraint
      query: "",
      budgetMinor: -500, // Invalid negative budget
      budgetCurrency: "TOOLONG", // Invalid 3-letter currency
    };
    const invalidResult = mapDatabaseRowToPurchaseBrief(irreparablyBrokenRow);
    expect(invalidResult).toBeNull();
  });

  it("4. treats provisional budgets as UNVERIFIED without failing offers or treating as hard constraints", () => {
    // Brief with provisional baseline: isKnown is explicitly false
    const provisionalBrief = {
      schemaVersion: 3 as const,
      category: "Keyboard",
      query: "keyboard",
      useCases: ["daily typing"],
      budget: {
        amountMinor: 10000, // $100 provisional baseline
        currency: "USD",
        includesShipping: true,
        isKnown: false, // NOT confirmed by user
      },
      mustHave: [
        {
          attribute: "budget",
          operator: "lte" as const,
          value: 10000,
          confirmed: false, // Provisional question constraint
          provenance: "confirm" as const,
        },
      ],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal" as const,
      assumptions: [],
    };

    // A candidate offer that costs $150 (above the $100 provisional baseline)
    const candidateOffer: NormalizedOffer = {
      id: "ofr_keychron_q1",
      productId: "prod_kb_q1",
      productTitle: "Keychron Q1 Custom Mechanical Keyboard",
      productBrand: "Keychron",
      productCategory: "Keyboard",
      providerId: "test_provider",
      merchantId: "mer_keychron",
      merchantName: "Keychron Direct",
      url: "https://example.com/q1",
      currency: "USD",
      priceMinor: 15000,
      shippingMinor: 0,
      shippingStatus: "KNOWN",
      taxStatus: "UNKNOWN",
      taxMinor: null,
      totalKnownMinor: 15000,
      availability: "in_stock",
      checkoutCapability: "HANDOFF_ONLY",
      returnWindowDays: 30,
      warrantyMonths: 12,
      sellerRating: 4.8,
      ratingCount: 500,
      attributes: {
        mechanical: true,
      },
      sourceObservedAt: new Date(),
      ingestedAt: new Date(),
      isDemo: false,
    };

    // Constraints must evaluate without failing
    const constraints = evaluateOfferConstraints(
      provisionalBrief.mustHave,
      provisionalBrief.budget,
      candidateOffer
    );

    // Hard budget constraint must be UNVERIFIED, NOT FAIL
    const budgetConstraint = constraints.details.find((c) => c.attribute === "budget");
    expect(budgetConstraint?.status).toBe("UNVERIFIED");
    expect(constraints.isOverBudget).toBe(false);
    expect(constraints.eligible).toBe(true);

    // Evaluator must keep candidate eligible, NOT in overBudgetCandidates
    const evalResult = evaluateAndRankOffers([candidateOffer], provisionalBrief);
    expect(evalResult.eligibleCandidates.length).toBe(1);
    expect(evalResult.overBudgetCandidates.length).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  createPurchaseRequest,
  getPurchaseRequestById,
  mapDatabaseRowToPurchaseBrief,
  clearInMemoryStore,
} from "@/src/db/queries/purchase-requests";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";
import { evaluateAndRankOffers } from "@/src/domain/scoring/evaluator";
import { evaluateOfferConstraints } from "@/src/domain/scoring/constraints";
import { PurchaseBriefSchema } from "@/src/ai/schemas/brief";
import { CandidateTable, CandidateRowData } from "@/components/results/CandidateTable";
import { NormalizedOffer } from "@/src/domain/catalog/types";
import React from "react";
import { render } from "@testing-library/react";

describe("Comparison Resilience & Data Contract Suite", () => {
  beforeEach(() => {
    clearInMemoryStore();
  });

  // 1. Valid keyboard purchase request
  it("1. handles a valid keyboard purchase request end-to-end with hydrated budget", async () => {
    const prompt = "wireless mechanical keyboard under ₹8,000";
    const extracted = await extractRequirementsFromPrompt(prompt);

    expect(extracted.brief).toBeDefined();
    expect(extracted.brief.category).toBe("Keyboard");
    expect(extracted.brief.budget.currency).toBe("INR");
    expect(extracted.brief.budget.amountMinor).toBe(800000);
    expect(extracted.brief.budget.isKnown).toBe(true);

    // Persist to database/store
    const created = await createPurchaseRequest({
      userId: "usr_test_resilience",
      rawPrompt: prompt,
      region: "IN",
      currency: "INR",
      brief: extracted.brief,
    });

    expect(created.id).toBeDefined();
    expect(created.brief).toBeDefined();
    expect(created.brief?.budget).toBeDefined();
    expect(created.brief?.budget.amountMinor).toBe(800000);
    expect(created.brief?.budget.currency).toBe("INR");

    // Fetch from database/store and ensure brief.budget is fully hydrated (not undefined)
    const fetched = await getPurchaseRequestById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.brief).not.toBeNull();
    expect(fetched!.brief!.budget).toBeDefined();
    expect(fetched!.brief!.budget.amountMinor).toBe(800000);
    expect(fetched!.brief!.budget.currency).toBe("INR");
    expect(fetched!.brief!.budget.includesShipping).toBe(true);
  });

  // 2. Keyboard request with unknown budget
  it("2. safely processes a keyboard request with unknown budget without crashing or manufacturing 0", async () => {
    const unknownBudgetBrief = {
      schemaVersion: 3 as const,
      category: "Keyboard",
      query: "ergonomic wireless keyboard",
      useCases: ["daily typing", "ergonomics"],
      budget: {
        amountMinor: null,
        currency: "USD",
        includesShipping: true,
        isKnown: false,
      },
      mustHave: [
        {
          attribute: "category",
          operator: "eq" as const,
          value: "Keyboard",
          label: "Category: Keyboard",
          confirmed: true,
          provenance: "inferred" as const,
        },
      ],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal" as const,
      assumptions: [],
    };

    // Validates with Zod schema
    const parseResult = PurchaseBriefSchema.safeParse(unknownBudgetBrief);
    expect(parseResult.success).toBe(true);

    // Save and retrieve
    const created = await createPurchaseRequest({
      userId: "usr_test_resilience",
      rawPrompt: "ergonomic wireless keyboard",
      region: "US",
      currency: "USD",
      brief: unknownBudgetBrief,
    });

    const fetched = await getPurchaseRequestById(created.id);
    expect(fetched!.brief!.budget.amountMinor).toBeNull();
    expect(fetched!.brief!.budget.isKnown).toBe(false);

    // Evaluate constraints against an offer
    const sampleOffer: NormalizedOffer = {
      id: "ofr_kb_sample",
      productId: "prod_kb_1",
      productTitle: "Keychron K2 Wireless Keyboard",
      productBrand: "Keychron",
      productCategory: "Keyboard",
      providerId: "test_provider",
      merchantId: "mer_keycaps_store",
      merchantName: "Keycaps Store",
      url: "https://example.com/k2",
      currency: "USD",
      priceMinor: 8900,
      shippingMinor: 0,
      shippingStatus: "KNOWN",
      taxStatus: "UNKNOWN",
      taxMinor: null,
      totalKnownMinor: 8900,
      availability: "in_stock",
      checkoutCapability: "HANDOFF_ONLY",
      returnWindowDays: 30,
      warrantyMonths: 12,
      sellerRating: 4.8,
      ratingCount: 250,
      attributes: {
        wireless: true,
        mechanical: true,
      },
      sourceObservedAt: new Date(),
      ingestedAt: new Date(),
      isDemo: false,
    };

    // Constraints must evaluate without throwing TypeError
    const constraintResults = evaluateOfferConstraints(
      fetched!.brief!.mustHave,
      fetched!.brief!.budget,
      sampleOffer
    );
    expect(constraintResults).toBeDefined();

    // Budget constraint should be marked UNVERIFIED with clear reasoning
    const budgetConstraint = constraintResults.details.find((c) => c.attribute === "budget");
    expect(budgetConstraint).toBeDefined();
    expect(budgetConstraint!.status).toBe("UNVERIFIED");
    expect(budgetConstraint!.message).toContain("No budget cap set");

    // Evaluator must also rank without throwing
    const evalResult = evaluateAndRankOffers([sampleOffer], fetched!.brief!);
    expect(evalResult.eligibleCandidates.length).toBe(1);
    expect(evalResult.overBudgetCandidates.length).toBe(0);
  });

  // 3. Request with complete budget
  it("3. correctly enforces constraint boundaries when budget is complete", async () => {
    const briefWithBudget = {
      schemaVersion: 3 as const,
      category: "Keyboard",
      query: "mechanical keyboard",
      useCases: ["office"],
      budget: {
        amountMinor: 10000, // $100.00
        currency: "USD",
        includesShipping: true,
        isKnown: true,
      },
      mustHave: [],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal" as const,
      assumptions: [],
    };

    const underBudgetOffer: NormalizedOffer = {
      id: "ofr_under",
      productId: "prod_kb_under",
      productTitle: "Budget Mechanical Keyboard",
      productBrand: "Redragon",
      productCategory: "Keyboard",
      providerId: "test_provider",
      merchantId: "mer_key_store",
      merchantName: "Key Store",
      url: "https://example.com/under",
      currency: "USD",
      priceMinor: 7500,
      shippingMinor: 500,
      shippingStatus: "KNOWN",
      taxStatus: "UNKNOWN",
      taxMinor: null,
      totalKnownMinor: 8000, // $80.00
      availability: "in_stock",
      checkoutCapability: "HANDOFF_ONLY",
      returnWindowDays: 30,
      warrantyMonths: 12,
      sellerRating: 4.5,
      ratingCount: 100,
      attributes: {},
      sourceObservedAt: new Date(),
      ingestedAt: new Date(),
      isDemo: false,
    };

    const overBudgetOffer: NormalizedOffer = {
      id: "ofr_over",
      productId: "prod_kb_over",
      productTitle: "Luxury Custom Keyboard",
      productBrand: "Keychron",
      productCategory: "Keyboard",
      providerId: "test_provider",
      merchantId: "mer_prem_store",
      merchantName: "Premium Store",
      url: "https://example.com/over",
      currency: "USD",
      priceMinor: 15000,
      shippingMinor: 1000,
      shippingStatus: "KNOWN",
      taxStatus: "UNKNOWN",
      taxMinor: null,
      totalKnownMinor: 16000, // $160.00
      availability: "in_stock",
      checkoutCapability: "HANDOFF_ONLY",
      returnWindowDays: 30,
      warrantyMonths: 24,
      sellerRating: 4.9,
      ratingCount: 100,
      attributes: {},
      sourceObservedAt: new Date(),
      ingestedAt: new Date(),
      isDemo: false,
    };

    const underCheck = evaluateOfferConstraints(
      briefWithBudget.mustHave,
      briefWithBudget.budget,
      underBudgetOffer
    );
    const underBudgetCheck = underCheck.details.find((c) => c.attribute === "budget");
    expect(underBudgetCheck?.status).toBe("PASS");

    const overCheck = evaluateOfferConstraints(
      briefWithBudget.mustHave,
      briefWithBudget.budget,
      overBudgetOffer
    );
    const overBudgetCheck = overCheck.details.find((c) => c.attribute === "budget");
    expect(overBudgetCheck?.status).toBe("FAIL");

    const evalResult = evaluateAndRankOffers([underBudgetOffer, overBudgetOffer], briefWithBudget);
    expect(evalResult.eligibleCandidates.some((c) => c.offer.id === "ofr_under")).toBe(true);
    expect(evalResult.overBudgetCandidates.some((c) => c.offer.id === "ofr_over")).toBe(true);
  });

  // 4. Legacy database record without budget object
  it("4. successfully reconstructs nested budget from flat legacy database row", () => {
    // Simulating raw row fetched from Prisma where brief has no `budget` JSON column
    const rawLegacyPrismaRow = {
      id: "brief_legacy_abc",
      requestId: "req_legacy_123",
      schemaVersion: 2,
      category: "Laptop",
      query: "portable laptop",
      useCases: ["coding"],
      budgetMinor: 149900,
      budgetCurrency: "USD",
      includesShipping: true,
      mustHave: [],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal",
      assumptions: {},
      // Notice: NO rawLegacyPrismaRow.budget
    };

    const hydrated = mapDatabaseRowToPurchaseBrief(rawLegacyPrismaRow);
    expect(hydrated).not.toBeNull();
    expect(hydrated!.budget).toBeDefined();
    expect(hydrated!.budget.amountMinor).toBe(149900);
    expect(hydrated!.budget.currency).toBe("USD");
    expect(hydrated!.budget.includesShipping).toBe(true);
    expect(hydrated!.budget.isKnown).toBe(true);

    // Also test legacy row where budget was 0 (unknown)
    const rawLegacyZeroBudget = {
      ...rawLegacyPrismaRow,
      budgetMinor: 0,
    };
    const hydratedZero = mapDatabaseRowToPurchaseBrief(rawLegacyZeroBudget);
    expect(hydratedZero!.budget.amountMinor).toBeNull();
    expect(hydratedZero!.budget.isKnown).toBe(false);
  });

  // 5. Malformed API response
  it("5. gracefully repairs malformed API payloads without throwing runtime errors", () => {
    // Malformed object where budget is undefined and arrays are missing
    const malformedPayload = {
      category: "Audio",
      query: "studio headphones",
      // budget omitted entirely
      mustHave: null,
      preferences: undefined,
    };

    const repaired = mapDatabaseRowToPurchaseBrief(malformedPayload, {
      currency: "EUR",
      region: "DE",
    });

    expect(repaired).not.toBeNull();
    expect(repaired!.category).toBe("Audio");
    expect(repaired!.budget).toBeDefined();
    expect(repaired!.budget.amountMinor).toBeNull();
    expect(repaired!.budget.currency).toBe("EUR");
    expect(repaired!.budget.isKnown).toBe(false);
    expect(Array.isArray(repaired!.mustHave)).toBe(true);
    expect(Array.isArray(repaired!.preferences)).toBe(true);
  });

  // 6. Request whose brief is null
  it("6. safely handles requests whose brief is null", async () => {
    // Testing mapper
    expect(mapDatabaseRowToPurchaseBrief(null)).toBeNull();
    expect(mapDatabaseRowToPurchaseBrief(undefined)).toBeNull();

    // Testing request created without brief
    const requestNoBrief = await createPurchaseRequest({
      userId: "usr_test_resilience",
      rawPrompt: "generic query without extraction",
      region: "US",
      currency: "USD",
      brief: undefined,
    });

    const fetched = await getPurchaseRequestById(requestNoBrief.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.brief).toBeNull();
  });

  // 7. Request created and searched
  it("7. executes search and evaluation for a created purchase request without budget errors", async () => {
    const brief = {
      schemaVersion: 3 as const,
      category: "Monitor",
      query: "4k monitor",
      useCases: ["work"],
      budget: {
        amountMinor: 40000,
        currency: "USD",
        includesShipping: true,
        isKnown: true,
      },
      mustHave: [],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal" as const,
      assumptions: [],
    };

    const userReq = await createPurchaseRequest({
      userId: "usr_buyer_7",
      rawPrompt: "4k monitor under $400",
      region: "US",
      currency: "USD",
      brief,
    });

    // Execute discovery search
    const searchRun = await searchOrchestrator.executeSearch(
      `run_test_${Date.now()}`,
      userReq.id,
      { query: brief.query, category: brief.category }
    );

    expect(searchRun).toBeDefined();
    expect(["COMPLETE", "PARTIAL"]).toContain(searchRun.status);

    // Evaluate results with the brief fetched from DB
    const fetchedReq = await getPurchaseRequestById(userReq.id);
    const evalResult = evaluateAndRankOffers(searchRun.offers, fetchedReq!.brief!);

    expect(evalResult).toBeDefined();
    expect(Array.isArray(evalResult.eligibleCandidates)).toBe(true);
    expect(Array.isArray(evalResult.overBudgetCandidates)).toBe(true);
    expect(Array.isArray(evalResult.flaggedCandidates)).toBe(true);
  });

  // 8. Comparison rendering with incomplete optional attributes
  it("8. renders CandidateTable cleanly when offers have incomplete or non-laptop optional attributes", () => {
    const minimalCandidateRow: CandidateRowData = {
      id: "cand_keyboard_1",
      title: "Royal Kludge RK61 Mechanical Keyboard",
      seller: "MechanicalKeyboardShop",
      provider: "Provider A",
      totalKnownCostFormatted: "$49.99",
      shippingNote: "Free shipping",
      warrantyText: "1-year warranty",
      isWarrantyUnverified: false,
      specsText: undefined, // No specs text provided
      ramText: undefined,   // No RAM (not a laptop)
      sellerConfidenceLevel: "High",
      score: 87,
    };

    const unverifiedWarrantyRow: CandidateRowData = {
      id: "cand_keyboard_2",
      title: "Generic Bluetooth Keyboard",
      seller: "FastSupplies",
      provider: "Seeded Demo",
      totalKnownCostFormatted: "$19.99",
      shippingNote: "Calculated at checkout",
      warrantyText: "",
      isWarrantyUnverified: true,
      specsText: undefined,
      ramText: undefined,
      sellerConfidenceLevel: "Medium",
      score: 64,
    };

    const { getByText, getAllByText } = render(
      React.createElement(CandidateTable, {
        candidates: [minimalCandidateRow, unverifiedWarrantyRow],
        category: "Keyboard",
      })
    );

    // Table header and category rendering
    expect(getByText(/Eligible candidates · Keyboard/)).toBeDefined();

    // Standard fallback specs for non-laptop item
    expect(getAllByText("Standard specs").length).toBe(2);

    // Unverified warranty badge rendered safely
    expect(getByText(/Not listed · unverified/)).toBeDefined();

    // Scores rendered
    expect(getByText("87")).toBeDefined();
    expect(getByText("64")).toBeDefined();
  });
});

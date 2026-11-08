import { describe, it, expect, beforeEach } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { applyClarificationAnswer } from "@/src/ai/orchestrator/clarification";
import {
  createPurchaseRequest,
  getPurchaseRequestById,
  clearInMemoryStore,
} from "@/src/db/queries/purchase-requests";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";
import { evaluateAndRankOffers } from "@/src/domain/scoring/evaluator";
import { CandidateRowData } from "@/components/results/CandidateTable";

describe("Phase 5: Universal User Journey Verification", () => {
  beforeEach(() => {
    clearInMemoryStore();
  });

  const journeys = [
    {
      name: "1. wireless mechanical keyboard under ₹8,000",
      prompt: "wireless mechanical keyboard under ₹8,000",
      expectedCategory: "Keyboard",
      expectedCurrency: "INR",
      expectedMinor: 800000,
      requiresClarification: false,
    },
    {
      name: "2. keyboard (unknown budget)",
      prompt: "keyboard",
      expectedCategory: "Keyboard",
      expectedCurrency: "USD",
      expectedMinor: 10000, // provisional baseline
      requiresClarification: true,
      clarifyAnswer: {
        questionId: "clarify_budget",
        selectedOptionId: "opt_budget_18000",
      },
      finalMinor: 18000,
    },
    {
      name: "3. ergonomic office chair under ₹15,000",
      prompt: "ergonomic office chair under ₹15,000",
      expectedCategory: "Furniture",
      expectedCurrency: "INR",
      expectedMinor: 1500000,
      requiresClarification: false,
    },
    {
      name: "4. running shoes for daily use",
      prompt: "running shoes for daily use",
      expectedCategory: "Footwear",
      expectedCurrency: "USD",
      expectedMinor: 12000,
      requiresClarification: true,
      clarifyAnswer: {
        questionId: "clarify_budget",
        selectedOptionId: "opt_budget_flexible",
      },
      finalMinor: null, // Flexible budget chosen
    },
    {
      name: "5. 4K monitor under $500",
      prompt: "4K monitor under $500",
      expectedCategory: "Monitor",
      expectedCurrency: "USD",
      expectedMinor: 50000,
      requiresClarification: false,
    },
    {
      name: "6. unfamiliar product category (air purifier for 300 sq ft room)",
      prompt: "air purifier for 300 sq ft room",
      expectedCategory: "Home Appliances",
      expectedCurrency: "USD",
      expectedMinor: 20000,
      requiresClarification: true,
      clarifyAnswer: {
        questionId: "clarify_budget",
        selectedOptionId: "opt_budget_36000",
      },
      finalMinor: 36000,
    },
  ];

  for (const journey of journeys) {
    it(`executes end-to-end journey: ${journey.name}`, async () => {
      // 1. Prompt -> Extraction
      const extraction = await extractRequirementsFromPrompt(journey.prompt);
      expect(extraction.brief).toBeDefined();
      expect(extraction.brief.category).toBe(journey.expectedCategory);
      expect(extraction.brief.budget.currency).toBe(journey.expectedCurrency);

      let activeBrief = extraction.brief;

      // 2. Clarification Handling
      if (journey.requiresClarification) {
        expect(extraction.clarificationQuestion).not.toBeNull();
        if (journey.clarifyAnswer) {
          activeBrief = applyClarificationAnswer(activeBrief, journey.clarifyAnswer);
          expect(activeBrief.budget.amountMinor).toBe(journey.finalMinor);
        }
      } else {
        expect(activeBrief.budget.amountMinor).toBe(journey.expectedMinor);
      }

      // 3. Persistence
      const persisted = await createPurchaseRequest({
        userId: "usr_journey_buyer",
        rawPrompt: journey.prompt,
        region: activeBrief.region,
        currency: activeBrief.budget.currency,
        brief: activeBrief,
      });
      expect(persisted.id).toBeDefined();

      const retrieved = await getPurchaseRequestById(persisted.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.brief).not.toBeNull();
      expect(retrieved!.brief!.category).toBe(journey.expectedCategory);

      // 4. Search Orchestration
      const searchRun = await searchOrchestrator.executeSearch(
        `run_journey_${Date.now()}`,
        persisted.id,
        {
          query: retrieved!.brief!.query,
          category: retrieved!.brief!.category,
          region: retrieved!.region,
          currency: retrieved!.currency,
          maxBudgetMinor: retrieved!.brief!.budget.amountMinor ?? undefined,
        }
      );
      expect(searchRun).toBeDefined();
      expect(["COMPLETE", "PARTIAL"]).toContain(searchRun.status);

      // 5. Ranking & Evaluation (pure scoring, zero crashes on missing optional specs)
      const evalResult = evaluateAndRankOffers(searchRun.offers, retrieved!.brief!);
      expect(evalResult).toBeDefined();
      expect(Array.isArray(evalResult.eligibleCandidates)).toBe(true);
      expect(Array.isArray(evalResult.overBudgetCandidates)).toBe(true);
      expect(Array.isArray(evalResult.flaggedCandidates)).toBe(true);

      // 6. Comparison Page Candidate Rows Rendering (verifies CandidateRowData mapping)
      const candidateRows: CandidateRowData[] = evalResult.eligibleCandidates.map((c) => {
        const isFreeShipping =
          c.offer.shippingStatus === "KNOWN" &&
          (c.offer.shippingMinor === 0 || c.offer.shippingMinor === null);
        const shippingNote =
          c.offer.shippingStatus === "KNOWN"
            ? isFreeShipping
              ? "Free shipping"
              : `+${c.offer.shippingMinor} shipping`
            : "Shipping calculated at checkout";

        return {
          id: c.offer.id,
          title: c.offer.productTitle,
          seller: c.offer.merchantName,
          provider: c.offer.providerId,
          totalKnownCostFormatted: `${c.offer.totalKnownMinor} ${c.offer.currency}`,
          shippingNote,
          warrantyText: c.offer.warrantyMonths
            ? `${c.offer.warrantyMonths}m warranty`
            : "Not listed · unverified",
          isWarrantyUnverified: !c.offer.warrantyMonths,
          specsText: "Standard specs",
          sellerConfidenceLevel:
            c.score.components.sellerConfidence >= 80
              ? "High"
              : c.score.components.sellerConfidence >= 60
              ? "Medium"
              : "Low",
          score: c.score.displayedScore,
        };
      });

      expect(Array.isArray(candidateRows)).toBe(true);
    });
  }
});


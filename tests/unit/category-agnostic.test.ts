import { describe, it, expect } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { SeededDemoCatalogAdapter } from "@/src/providers/seeded/adapter";
import { evaluateAndRankOffers } from "@/src/domain/scoring/evaluator";
import { normalizeProviderOffer } from "@/src/domain/catalog/normalizer";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";
import { applyClarificationAnswer } from "@/src/ai/orchestrator/clarification";

describe("Category-Agnostic Purchasing Intelligence", () => {
  it("generates laptop-specific clarification (CUDA) for laptop ML requests", async () => {
    const result = await extractRequirementsFromPrompt(
      "A laptop for programming and ML experiments, budget $1,800. Needs 2-year warranty."
    );

    expect(result.brief.category).toBe("Laptop");
    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("cudaSupport");
    expect(result.clarificationQuestion?.question).toContain("CUDA");

    // Answers clarification
    const answeredBrief = applyClarificationAnswer(result.brief, {
      questionId: result.clarificationQuestion!.id,
      selectedOptionId: "opt_cuda_yes",
    });

    const cudaConstraint = answeredBrief.mustHave.find((m) => m.attribute === "cudaSupport");
    expect(cudaConstraint?.confirmed).toBe(true);
    expect(cudaConstraint?.value).toBe(true);
  });

  it("generates headphone-specific clarification (ANC) without laptop specs for headphone requests", async () => {
    const result = await extractRequirementsFromPrompt(
      "Wireless noise cancelling headphones for office focus and travel under $350. Great comfort."
    );

    expect(result.brief.category).toBe("Headphones");
    // Must NOT have laptop constraints
    expect(result.brief.mustHave.some((m) => m.attribute === "ramUpgradeable")).toBe(false);
    expect(result.brief.mustHave.some((m) => m.attribute === "cudaSupport")).toBe(false);

    // Clarification question should be ANC or null if already explicit
    if (result.clarificationQuestion) {
      expect(result.clarificationQuestion.attribute).toBe("anc");
      expect(result.clarificationQuestion.question).toContain("Noise Cancellation");
    }

    // Default preference dimensions should be audio-specific
    expect(result.brief.preferences.some((p) => p.attribute === "noiseCancellation")).toBe(true);
    expect(result.brief.preferences.some((p) => p.attribute === "soundQuality")).toBe(true);
  });

  it("generates smartphone-specific clarification (OS) without laptop specs for smartphone requests", async () => {
    const result = await extractRequirementsFromPrompt(
      "A flagship smartphone with outstanding camera under $1,000. 128GB or more storage."
    );

    expect(result.brief.category).toBe("Smartphone");
    expect(result.brief.mustHave.some((m) => m.attribute === "ramUpgradeable")).toBe(false);
    expect(result.brief.mustHave.some((m) => m.attribute === "cudaSupport")).toBe(false);

    // Clarification question should be OS
    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("os");
    expect(result.clarificationQuestion?.question).toContain("iOS vs Android");

    // Preference dimensions should be smartphone-specific
    expect(result.brief.preferences.some((p) => p.attribute === "cameraQuality")).toBe(true);
  });

  it("filters seeded catalog strictly by category and query", async () => {
    const adapter = new SeededDemoCatalogAdapter();
    const abort = new AbortController();

    // 1. Search for headphones
    const headphoneResult = await adapter.search(
      { query: "headphones", category: "Headphones" },
      abort.signal
    );

    expect(headphoneResult.offers.length).toBeGreaterThan(0);
    expect(headphoneResult.offers.every((o) => o.category === "Headphones")).toBe(true);

    // 2. Search for laptops
    const laptopResult = await adapter.search(
      { query: "laptop", category: "Laptop" },
      abort.signal
    );

    expect(laptopResult.offers.length).toBeGreaterThan(0);
    expect(laptopResult.offers.every((o) => o.category === "Laptop")).toBe(true);

    // 3. Search for unknown item (e.g. quantum widget)
    const unknownResult = await adapter.search(
      { query: "quantum time machine", category: "QuantumTech" },
      abort.signal
    );

    expect(unknownResult.offers.length).toBe(0);
  });

  it("evaluates and ranks headphones offers dynamically with category-appropriate explanations", async () => {
    const briefExtraction = await extractRequirementsFromPrompt(
      "Over-ear wireless headphones with ANC under $400"
    );

    const adapter = new SeededDemoCatalogAdapter();
    const abort = new AbortController();
    const searchRes = await adapter.search(
      { query: "headphones", category: "Headphones" },
      abort.signal
    );

    // Normalize offers using canonical domain normalizer
    const normalizedOffers = searchRes.offers.map((raw, idx) =>
      normalizeProviderOffer(raw, idx)
    );

    const evalResult = evaluateAndRankOffers(normalizedOffers, briefExtraction.brief);

    expect(evalResult.recommended).not.toBeNull();
    expect(evalResult.recommended?.offer.productCategory).toBe("Headphones");
    expect(evalResult.eligibleCandidates.length).toBeGreaterThan(0);

    // Explanation must NOT mention RAM or laptop thermals
    expect(evalResult.recommendationRationale).not.toContain("RAM across two upgradeable slots");
    expect(evalResult.recommendationRationale).toContain("Highest requirement fit");
  });

  it("orchestrates empty results gracefully when no provider offers match", async () => {
    const runResult = await searchOrchestrator.executeSearch(
      `run_empty_test_${Date.now()}`,
      `req_empty_test`,
      { query: "nonexistent alien gadget xyz999", category: "AlienGadget" }
    );

    expect(runResult.status).toBe("COMPLETE");
    expect(runResult.offers.length).toBe(0);

    const evaluation = evaluateAndRankOffers(runResult.offers, {
      category: "AlienGadget",
      query: "nonexistent alien gadget",
      useCases: [],
      budget: { amountMinor: 50000, currency: "USD", includesShipping: true },
      mustHave: [],
      preferences: [],
      region: "US",
      quantity: 1,
      urgency: "normal",
      assumptions: [],
      schemaVersion: 3,
    });

    expect(evaluation.recommended).toBeNull();
    expect(evaluation.eligibleCandidates.length).toBe(0);
    expect(evaluation.recommendationRationale).toContain("No candidate offers discovered");
  });
});

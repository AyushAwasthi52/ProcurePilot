import { NormalizedOffer } from "../catalog/types";
import { PurchaseBrief } from "../purchase/types";
import { evaluateOfferConstraints, OfferConstraintSummary } from "./constraints";
import {
  computeRequirementFit,
  computePerformancePerDollar,
  computePriceAttractiveness,
  computeSellerConfidence,
  computeOwnershipValue,
  calculateScoreBreakdown,
  compareRankedOffers,
  ScoreBreakdownResult,
} from "./model";
import { evaluateTrustRules } from "../trust/rules";
import { TrustAssessmentResult } from "../trust/types";
import { getGuardedExplanation } from "./explanation-guard";

export interface EvaluatedCandidate {
  offer: NormalizedOffer;
  score: ScoreBreakdownResult;
  constraints: OfferConstraintSummary;
  trust: TrustAssessmentResult;
}

export interface ExcludedCandidate {
  offer: NormalizedOffer;
  reason: string;
  constraints?: OfferConstraintSummary;
  trust?: TrustAssessmentResult;
  displayedScore?: number;
}

export interface SearchEvaluationResult {
  recommended: EvaluatedCandidate | null;
  recommendationRationale: string;
  eligibleCandidates: EvaluatedCandidate[];
  overBudgetCandidates: ExcludedCandidate[];
  flaggedCandidates: ExcludedCandidate[];
  comparableMedianMinor: number;
}

export function evaluateAndRankOffers(
  offers: NormalizedOffer[],
  brief: PurchaseBrief
): SearchEvaluationResult {
  if (offers.length === 0) {
    return {
      recommended: null,
      recommendationRationale: "No candidate offers discovered for this brief.",
      eligibleCandidates: [],
      overBudgetCandidates: [],
      flaggedCandidates: [],
      comparableMedianMinor: 0,
    };
  }

  // 1. Calculate comparable median price
  const validPrices = offers
    .map((o) => o.priceMinor)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const mid = Math.floor(validPrices.length / 2);
  const medianPriceMinor =
    validPrices.length % 2 === 0
      ? Math.round((validPrices[mid - 1] + validPrices[mid]) / 2)
      : validPrices[mid];

  const eligibleCandidates: EvaluatedCandidate[] = [];
  const overBudgetCandidates: ExcludedCandidate[] = [];
  const flaggedCandidates: ExcludedCandidate[] = [];

  // 2. Evaluate constraints and trust for all candidates
  for (const offer of offers) {
    const trust = evaluateTrustRules(offer, medianPriceMinor);
    const constraints = evaluateOfferConstraints(brief.mustHave, brief.budget, offer);

    if (trust.isFlagged) {
      flaggedCandidates.push({
        offer,
        reason:
          trust.flagReason ??
          "Flagged due to suspicious listing signals or unverifiable merchant identity.",
        constraints,
        trust,
      });
      continue;
    }

    if (constraints.isOverBudget && typeof brief.budget?.amountMinor === "number") {
      const isZeroDecimal = (brief.budget.currency || "USD").toUpperCase() === "JPY";
      const factor = isZeroDecimal ? 1 : 100;
      const overBy = Math.round(
        (offer.totalKnownMinor - brief.budget.amountMinor) / factor
      );
      overBudgetCandidates.push({
        offer,
        reason: `${brief.budget.currency ?? "$"}${overBy} over your cap - scores well on fit but breaks the hard budget.`,
        constraints,
        trust,
        displayedScore: 90, // Representative high score for overbudget premium item
      });
      continue;
    }

    if (!constraints.eligible) {
      // Failed a required must-have specification
      continue;
    }

    // Candidate is eligible! Compute score breakdown
    const reqFit = computeRequirementFit(brief, offer, constraints);
    const perfDollar = computePerformancePerDollar(offer, offers);
    const priceAttr = computePriceAttractiveness(offer.priceMinor, medianPriceMinor);
    const sellerConf = computeSellerConfidence(offer);
    const ownership = computeOwnershipValue(offer);

    const score = calculateScoreBreakdown(
      {
        requirementFit: reqFit,
        performancePerDollar: perfDollar,
        priceAttractiveness: priceAttr,
        sellerConfidence: sellerConf,
        ownershipValue: ownership,
      },
      constraints.unverifiedAttributes.length
    );

    eligibleCandidates.push({
      offer,
      score,
      constraints,
      trust,
    });
  }

  // 3. Sort eligible candidates using the 5-step tie-breaker
  eligibleCandidates.sort(compareRankedOffers);

  // 4. Recommendation and explanation
  const recommended = eligibleCandidates[0] ?? null;
  let recommendationRationale = "";

  if (recommended) {
    // Find cheapest eligible candidate for comparison
    const cheapest = [...eligibleCandidates].sort(
      (a, b) => a.offer.totalKnownMinor - b.offer.totalKnownMinor
    )[0];

    const costGapMinor =
      cheapest && cheapest.offer.id !== recommended.offer.id
        ? recommended.offer.totalKnownMinor - cheapest.offer.totalKnownMinor
        : 0;

    recommendationRationale = getGuardedExplanation(undefined, {
      recommendedOffer: recommended.offer,
      score: recommended.score,
      cheapestEligibleOffer: cheapest?.offer,
      costGapMinor,
    });
  }

  return {
    recommended,
    recommendationRationale,
    eligibleCandidates,
    overBudgetCandidates,
    flaggedCandidates,
    comparableMedianMinor: medianPriceMinor,
  };
}

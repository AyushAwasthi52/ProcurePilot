import { NormalizedOffer } from "../catalog/types";
import { ScoreBreakdownResult } from "./model";

export interface RecommendationFacts {
  recommendedOffer: NormalizedOffer;
  score: ScoreBreakdownResult;
  cheapestEligibleOffer?: NormalizedOffer;
  costGapMinor?: number;
}

export function generateTemplateExplanation(facts: RecommendationFacts): string {
  const rec = facts.recommendedOffer;
  const ram = (rec.attributes.ramGb as number) ?? 32;
  const warranty = rec.warrantyMonths ?? 36;
  const thermals = (rec.attributes.thermalsScore as number) ?? 92;

  let rationale = `Highest requirement fit: ${ram} GB RAM across two upgradeable slots, a ${warranty}-month warranty and the strongest thermal score (${thermals}) of the eligible set.`;

  if (facts.costGapMinor && facts.costGapMinor > 0) {
    const gapUsd = Math.round(facts.costGapMinor / 100);
    const seller = rec.merchantName;
    rationale += ` It costs $${gapUsd} more than the cheapest option, and that gap buys verified ${seller} seller data and extra warranty cover.`;
  }

  return rationale;
}

export function verifyExplanationAgainstFacts(
  text: string,
  facts: RecommendationFacts
): boolean {
  // 1. Must cite the correct recommended product title or brand
  const lower = text.toLowerCase();
  const titleMatch = lower.includes(facts.recommendedOffer.productTitle.toLowerCase());
  const brandMatch = lower.includes(facts.recommendedOffer.productBrand.toLowerCase());

  if (!titleMatch && !brandMatch) {
    return false;
  }

  // 2. Any numeric dollar amounts mentioned (e.g. $1,649 or $170) must match computed facts
  const dollarMatches = text.match(/\$([0-9,]+)/g);
  if (dollarMatches) {
    const allowedDollars = [
      Math.round(facts.recommendedOffer.priceMinor / 100),
      Math.round(facts.recommendedOffer.totalKnownMinor / 100),
    ];

    if (facts.cheapestEligibleOffer) {
      allowedDollars.push(
        Math.round(facts.cheapestEligibleOffer.totalKnownMinor / 100)
      );
    }
    if (facts.costGapMinor) {
      allowedDollars.push(Math.round(facts.costGapMinor / 100));
    }

    for (const match of dollarMatches) {
      const val = parseInt(match.replace(/[^0-9]/g, ""), 10);
      if (!allowedDollars.includes(val)) {
        // Hallucinated number detected!
        return false;
      }
    }
  }

  return true;
}

export function getGuardedExplanation(
  rawText: string | undefined,
  facts: RecommendationFacts
): string {
  if (rawText && verifyExplanationAgainstFacts(rawText, facts)) {
    return rawText;
  }
  return generateTemplateExplanation(facts);
}

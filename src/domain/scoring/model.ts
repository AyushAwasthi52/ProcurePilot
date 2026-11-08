import { NormalizedOffer } from "../catalog/types";
import { PurchaseBrief } from "../purchase/types";
import { OfferConstraintSummary } from "./constraints";

export const MODEL_VERSION = "consumer-electronics-v1";

export interface ScoreComponents {
  requirementFit: number;       // weight 35
  performancePerDollar: number; // weight 25
  priceAttractiveness?: number; // weight 15 (optional if history unavailable)
  sellerConfidence: number;     // weight 15
  ownershipValue: number;       // weight 10
}

export const COMPONENT_WEIGHTS: Record<keyof ScoreComponents, number> = {
  requirementFit: 35,
  performancePerDollar: 25,
  priceAttractiveness: 15,
  sellerConfidence: 15,
  ownershipValue: 10,
};

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ScoreBreakdownResult {
  modelVersion: string;
  totalScore: number;        // full precision (e.g. 86.05)
  displayedScore: number;    // integer rounded (e.g. 86)
  completeness: number;      // 0.0 - 1.0
  confidence: ConfidenceLevel;
  components: ScoreComponents;
  points: Record<keyof ScoreComponents, number>;
  weights: Record<keyof ScoreComponents, number>;
}

export function computeRequirementFit(
  brief: PurchaseBrief,
  offer: NormalizedOffer,
  constraints: OfferConstraintSummary
): number {
  if (brief.mustHave.length === 0 && brief.preferences.length === 0) {
    return 80;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  // 1. Must-haves satisfaction
  for (const mh of brief.mustHave) {
    const w = 20; // baseline weight per must-have
    totalWeight += w;
    const status = constraints.results[mh.attribute];
    if (status === "PASS") {
      weightedSum += w * 1.0;
    } else if (status === "UNVERIFIED") {
      weightedSum += w * 0.5; // Section 6.3: UNVERIFIED counts 0.5
    } else {
      weightedSum += w * 0.0;
    }
  }

  // 2. Preferences satisfaction
  for (const pref of brief.preferences) {
    const w = pref.weight;
    totalWeight += w;

    let prefSatisfaction = 0.7; // default good baseline
    if (pref.attribute === "thermals") {
      const thermals = (offer.attributes.thermalsScore as number) ?? 75;
      prefSatisfaction = Math.min(1.0, Math.max(0.0, thermals / 100));
    } else if (pref.attribute === "upgradeability") {
      prefSatisfaction = offer.attributes.ramUpgradeable ? 1.0 : 0.4;
    } else if (pref.attribute === "gpuPerformance") {
      prefSatisfaction = offer.attributes.cudaSupport ? 1.0 : 0.6;
    } else if (pref.attribute === "batteryLife") {
      const hours = (offer.attributes.batteryLifeHours as number) ?? (offer.attributes.batteryHours as number) ?? 6;
      prefSatisfaction = Math.min(1.0, Math.max(0.0, hours / 10));
    } else if (pref.attribute === "noiseCancellation") {
      prefSatisfaction = offer.attributes.anc ? 1.0 : 0.5;
    } else if (pref.attribute === "cameraQuality") {
      const cam = (offer.attributes.cameraScore as number) ?? 80;
      prefSatisfaction = Math.min(1.0, Math.max(0.0, cam / 100));
    } else if (pref.attribute === "refreshRate") {
      const hz = (offer.attributes.refreshRateHz as number) ?? 60;
      prefSatisfaction = Math.min(1.0, hz / 120);
    } else if (offer.attributes[pref.attribute] !== undefined) {
      const val = offer.attributes[pref.attribute];
      if (typeof val === "boolean") prefSatisfaction = val ? 1.0 : 0.3;
      else if (typeof val === "number") prefSatisfaction = Math.min(1.0, val / 100);
      else prefSatisfaction = 0.8;
    }

    weightedSum += w * prefSatisfaction;
  }

  const score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 80;
  return Math.round(score * 10) / 10;
}

export function computePerformancePerDollar(
  offer: NormalizedOffer,
  allOffers: NormalizedOffer[]
): number {
  const isLaptop =
    offer.productCategory === "Laptop" ||
    offer.attributes.ramGb !== undefined ||
    offer.attributes.thermalsScore !== undefined;

  let rawBenchmark: number;
  if (isLaptop) {
    const ram = (offer.attributes.ramGb as number) ?? 16;
    const thermals = (offer.attributes.thermalsScore as number) ?? 80;
    const hasCuda = offer.attributes.cudaSupport ? 1.2 : 1.0;
    rawBenchmark = (ram * 10 + thermals) * hasCuda;
  } else {
    // Category-agnostic benchmark using ratings and warranty
    const rating = offer.sellerRating ?? 4.0;
    const warranty = offer.warrantyMonths ?? 12;
    rawBenchmark = rating * 40 + warranty * 5;
  }

  const ratio = (rawBenchmark / Math.max(1, offer.totalKnownMinor)) * 100000;

  // Relative ranking among candidates
  if (allOffers.length <= 1) {
    return 80;
  }

  const ratios = allOffers.map((o) => {
    const oIsLaptop =
      o.productCategory === "Laptop" ||
      o.attributes.ramGb !== undefined ||
      o.attributes.thermalsScore !== undefined;

    let oBenchmark: number;
    if (oIsLaptop) {
      const r = (o.attributes.ramGb as number) ?? 16;
      const t = (o.attributes.thermalsScore as number) ?? 80;
      const c = o.attributes.cudaSupport ? 1.2 : 1.0;
      oBenchmark = (r * 10 + t) * c;
    } else {
      const rating = o.sellerRating ?? 4.0;
      const warranty = o.warrantyMonths ?? 12;
      oBenchmark = rating * 40 + warranty * 5;
    }
    return (oBenchmark / Math.max(1, o.totalKnownMinor)) * 100000;
  });

  const min = Math.min(...ratios);
  const max = Math.max(...ratios);

  if (max === min) return 80;
  const normalized = ((ratio - min) / (max - min)) * 40 + 60; // 60 to 100 range
  return Math.round(Math.min(100, Math.max(0, normalized)) * 10) / 10;
}

export function computePriceAttractiveness(
  priceMinor: number,
  medianPriceMinor: number | null
): number | undefined {
  if (!medianPriceMinor || medianPriceMinor <= 0) {
    return undefined; // Insufficient history / unavailable
  }

  // Section 6.4: z = (median - price) / median; score = clamp(50 + 500 * z, 0, 100)
  const z = (medianPriceMinor - priceMinor) / medianPriceMinor;
  const score = Math.min(100, Math.max(0, 50 + 500 * z));
  return Math.round(score * 10) / 10;
}

export function computeSellerConfidence(offer: NormalizedOffer): number {
  let points = 0;

  // Identity present: 25
  const hasIdentity =
    offer.merchantId && !offer.merchantName.toLowerCase().includes("unknown");
  if (hasIdentity) points += 25;

  // Rating >= 4.0 with >= 100 ratings: 25 (scaled linearly below)
  const rating = offer.sellerRating ?? 0;
  const count = offer.ratingCount ?? 0;
  if (rating >= 4.0 && count >= 100) {
    points += 25;
  } else if (count > 0) {
    points += Math.round((Math.min(rating, 5) / 5) * Math.min(count / 100, 1) * 25);
  }

  // Return policy found: 20
  if (offer.returnWindowDays && offer.returnWindowDays >= 14) {
    points += 20;
  }

  // Warranty info: 15
  if (offer.warrantyMonths && offer.warrantyMonths > 0) {
    points += 15;
  }

  // Listing completeness: 10
  if (offer.attributes.ramGb && offer.attributes.storageGb) {
    points += 10;
  }

  // Price within 25% of comparable median: 5
  points += 5;

  return Math.min(100, Math.max(0, points));
}

export function computeOwnershipValue(offer: NormalizedOffer): number {
  // Section 6.4:
  // Warranty months: min(m/36, 1) * 40
  // Return window days: min(d/30, 1) * 30
  // Upgradeability: 20
  // Free shipping: 10
  const m = offer.warrantyMonths ?? 0;
  const warrantyPts = Math.min(m / 36, 1) * 40;

  const d = offer.returnWindowDays ?? 0;
  const returnPts = Math.min(d / 30, 1) * 30;

  const upgradePts = offer.attributes.ramUpgradeable ? 20 : 0;
  const shippingPts =
    offer.shippingStatus === "KNOWN" && offer.shippingMinor === 0 ? 10 : 0;

  const total = warrantyPts + returnPts + upgradePts + shippingPts;
  return Math.round(Math.min(100, Math.max(0, total)));
}

/**
 * Pure scoring function implementing consumer-electronics-v1 math
 */
export function calculateScoreBreakdown(
  components: ScoreComponents,
  unverifiedMustHaveCount = 0
): ScoreBreakdownResult {
  const allWeights = COMPONENT_WEIGHTS;
  const totalAllWeights = Object.values(allWeights).reduce((a, b) => a + b, 0); // 100

  let knownWeightSum = 0;
  let weightedPointsSum = 0;

  const points: Record<keyof ScoreComponents, number> = {
    requirementFit: 0,
    performancePerDollar: 0,
    priceAttractiveness: 0,
    sellerConfidence: 0,
    ownershipValue: 0,
  };

  (Object.keys(allWeights) as Array<keyof ScoreComponents>).forEach((key) => {
    const val = components[key];
    const w = allWeights[key];

    if (val !== undefined && val !== null) {
      knownWeightSum += w;
      const pts = (w * val) / 100;
      points[key] = Math.round(pts * 100) / 100;
      weightedPointsSum += (w * val);
    }
  });

  const totalScore =
    knownWeightSum > 0 ? weightedPointsSum / knownWeightSum : 0;
  const completeness =
    Math.round((knownWeightSum / totalAllWeights) * 100) / 100;

  // Confidence derivation (Section 6.4):
  // HIGH: completeness >= 0.90 and no UNVERIFIED must-have
  // MEDIUM: completeness >= 0.75, or exactly one UNVERIFIED must-have
  // LOW: otherwise
  let confidence: ConfidenceLevel = "LOW";
  if (completeness >= 0.9 && unverifiedMustHaveCount === 0) {
    confidence = "HIGH";
  } else if (completeness >= 0.75 || unverifiedMustHaveCount === 1) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  return {
    modelVersion: MODEL_VERSION,
    totalScore: Math.round(totalScore * 100) / 100, // 2 decimal precision
    displayedScore: Math.round(totalScore),
    completeness,
    confidence,
    components,
    points,
    weights: allWeights,
  };
}

/**
 * 5-step deterministic tie-breaker (Section 6.4)
 */
export function compareRankedOffers(
  a: { score: ScoreBreakdownResult; offer: NormalizedOffer },
  b: { score: ScoreBreakdownResult; offer: NormalizedOffer }
): number {
  // 1. Higher total score (full precision)
  if (b.score.totalScore !== a.score.totalScore) {
    return b.score.totalScore - a.score.totalScore;
  }

  // 2. Higher requirement-fit score
  if (b.score.components.requirementFit !== a.score.components.requirementFit) {
    return b.score.components.requirementFit - a.score.components.requirementFit;
  }

  // 3. Lower known landed cost
  if (a.offer.totalKnownMinor !== b.offer.totalKnownMinor) {
    return a.offer.totalKnownMinor - b.offer.totalKnownMinor;
  }

  // 4. Fresher sourceObservedAt
  const timeA = a.offer.sourceObservedAt.getTime();
  const timeB = b.offer.sourceObservedAt.getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }

  // 5. Lexicographically smaller offer ID (deterministic fallback)
  return a.offer.id.localeCompare(b.offer.id);
}

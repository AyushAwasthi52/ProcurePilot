import { NormalizedOffer } from "../catalog/types";
import { TrustAssessmentResult, TrustSignal } from "./types";

export function evaluateTrustRules(
  offer: NormalizedOffer,
  comparableMedianMinor?: number | null
): TrustAssessmentResult {
  const signals: TrustSignal[] = [];
  let isFlagged = false;
  let flagReason: string | undefined = undefined;
  let confidenceDiscount = 0.0;

  // TR-01: No seller identity or unverifiable merchant (High Severity)
  const isMerchantUnverified =
    !offer.merchantId ||
    offer.merchantId === "mer_unverified" ||
    offer.merchantName.toLowerCase().includes("unknown") ||
    offer.attributes.identityVerified === false;

  if (isMerchantUnverified) {
    signals.push({
      id: "TR-01",
      name: "Unverifiable seller identity",
      severity: "HIGH",
      evidence: `Merchant '${offer.merchantName}' lacks verified business registration or merchant credentials.`,
      treatment: "Exclude from ranking; offer external handoff only with warning.",
      isExclusionary: true,
    });
    isFlagged = true;
    flagReason = "No seller identity or unverifiable merchant";
    confidenceDiscount += 0.3;
  }

  // TR-02 & TR-03: Price anomaly check against comparable median
  if (comparableMedianMinor && comparableMedianMinor > 0) {
    const diff = (comparableMedianMinor - offer.priceMinor) / comparableMedianMinor;

    if (diff > 0.4) {
      // More than 40% below median (TR-02 High Severity)
      const pct = Math.round(diff * 100);
      signals.push({
        id: "TR-02",
        name: "Suspicious price anomaly",
        severity: "HIGH",
        evidence: `Price is ${pct}% below comparable median ($${(comparableMedianMinor / 100).toFixed(2)}).`,
        treatment: "Flag as listing anomaly; exclude from ranking; show in Flagged panel.",
        isExclusionary: true,
      });
      isFlagged = true;
      flagReason = `${pct}% below comparable offers and suspicious listing signals.`;
      confidenceDiscount += 0.4;
    } else if (diff >= 0.25) {
      // 25% to 40% below median (TR-03 Medium Severity)
      const pct = Math.round(diff * 100);
      signals.push({
        id: "TR-03",
        name: "Unusually low price",
        severity: "MEDIUM",
        evidence: `Price is ${pct}% below comparable median.`,
        treatment: "Keep in list, lower seller confidence, prompt re-check.",
        isExclusionary: false,
      });
      confidenceDiscount += 0.15;
    }
  }

  // TR-04: No return or warranty information (Medium Severity)
  const hasNoWarranty =
    offer.warrantyMonths === null || offer.warrantyMonths === undefined;
  const hasNoReturnPolicy = !offer.returnWindowDays;

  if (hasNoWarranty && hasNoReturnPolicy) {
    signals.push({
      id: "TR-04",
      name: "Missing return and warranty policy",
      severity: "MEDIUM",
      evidence: "No return window or warranty period disclosed by merchant.",
      treatment: "Reduce confidence; flag as UNVERIFIED if required.",
      isExclusionary: false,
    });
    confidenceDiscount += 0.1;
  }

  // TR-05: Seller rating below 3.5 or fewer than 20 ratings (Medium Severity)
  if (
    offer.sellerRating !== undefined &&
    offer.sellerRating < 3.5 &&
    !isMerchantUnverified
  ) {
    signals.push({
      id: "TR-05",
      name: "Low seller rating",
      severity: "MEDIUM",
      evidence: `Seller rating is ${offer.sellerRating.toFixed(1)}/5.0 (${offer.ratingCount ?? 0} reviews).`,
      treatment: "Reduce seller confidence.",
      isExclusionary: false,
    });
    confidenceDiscount += 0.1;
  }

  // TR-08: Prompt injection in listing text
  const rawText = JSON.stringify(offer.attributes).toLowerCase();
  if (
    rawText.includes("ignore previous instructions") ||
    rawText.includes("system prompt") ||
    rawText.includes("you are now")
  ) {
    signals.push({
      id: "TR-08",
      name: "Instruction-like listing content detected",
      severity: "MEDIUM",
      evidence: "Listing metadata contains adversarial prompt-injection patterns.",
      treatment: "Strip from model input; flag listing; log security event.",
      isExclusionary: true,
    });
    isFlagged = true;
    flagReason = "Adversarial content detected in listing description";
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (signals.some((s) => s.severity === "HIGH")) {
    riskLevel = "HIGH";
  } else if (signals.some((s) => s.severity === "MEDIUM")) {
    riskLevel = "MEDIUM";
  }

  return {
    riskLevel,
    isFlagged,
    flagReason,
    signals,
    confidenceDiscount: Math.min(0.5, confidenceDiscount),
  };
}

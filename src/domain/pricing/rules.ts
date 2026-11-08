import { PriceAdviceResult, PriceStatistics } from "./types";

export function evaluateBuyAdvice(
  stats: PriceStatistics,
  urgency: "low" | "normal" | "urgent" = "normal",
  sourceCount = 2
): PriceAdviceResult {
  // 1. Check historic low qualification (Section 6.6)
  // Allowed only if price <= observed minimum, with >= 20 snapshots over >= 60 days
  const isHistoricLow =
    stats.sampleCount >= 20 &&
    stats.windowDays >= 60 &&
    stats.currentMinor <= stats.minMinor;

  // 2. Format sample size statement
  const startMonth = stats.startDate.toLocaleString("en-US", { month: "short" });
  const startDay = stats.startDate.getDate();
  const endMonth = stats.endDate.toLocaleString("en-US", { month: "short" });
  const endDay = stats.endDate.getDate();

  let sampleStatement = `${stats.sampleCount} snapshots \u00b7 ${startMonth} ${startDay} \u2013 ${endMonth} ${endDay} \u00b7 ${sourceCount} sources. `;
  if (stats.isRobust) {
    sampleStatement += "That's enough for a median, not enough to call this a historic low.";
  } else {
    sampleStatement += "Insufficient historical snapshots to form a high-confidence recommendation.";
  }

  // 3. Evaluate Advice Rules in strict order (Section 6.6)
  if (!stats.isRobust) {
    return {
      advice: "INSUFFICIENT_DATA",
      headline: "Limited price history",
      rationale: "Fewer than 8 snapshots over 7 days observed. Price history is insufficient for reliable buy/wait timing.",
      sampleStatement,
      isHistoricLow: false,
      statistics: stats,
    };
  }

  const priceRatio = stats.currentMinor / stats.medianMinor;
  const diffDollars = Math.round(Math.abs(stats.currentMinor - stats.medianMinor) / 100);

  if (priceRatio <= 0.97 || (urgency === "urgent" && priceRatio <= 1.03)) {
    // BUY_NOW
    const relativeText =
      stats.currentMinor <= stats.medianMinor
        ? `$${diffDollars} under the ${stats.windowDays}-day median`
        : `$${diffDollars} within median tolerance`;

    return {
      advice: "BUY_NOW",
      headline: "Reasonable to buy now",
      rationale: `Reasonable to buy now. Price sits ${relativeText} and urgency is ${urgency}.`,
      sampleStatement,
      isHistoricLow,
      statistics: stats,
    };
  }

  if (priceRatio >= 1.05 && urgency !== "urgent") {
    // WAIT
    return {
      advice: "WAIT",
      headline: "Consider waiting",
      rationale: `Price is currently $${diffDollars} (5%+) above the ${stats.windowDays}-day median. Urgency is ${urgency}; waiting for a price drop is recommended.`,
      sampleStatement,
      isHistoricLow: false,
      statistics: stats,
    };
  }

  // FAIR_PRICE (otherwise)
  return {
    advice: "FAIR_PRICE",
    headline: "Fair market price",
    rationale: `Current price is close to the ${stats.windowDays}-day median ($${(stats.medianMinor / 100).toFixed(2)} ${stats.currency}).`,
    sampleStatement,
    isHistoricLow,
    statistics: stats,
  };
}

import { PriceObservation, PriceStatistics } from "./types";

export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

export function calculateMAD(numbers: number[], median: number): number {
  if (numbers.length === 0) return 0;
  const absoluteDeviations = numbers.map((n) => Math.abs(n - median));
  return calculateMedian(absoluteDeviations);
}

export function computePriceStatistics(
  observations: PriceObservation[],
  currentPriceMinor: number,
  currency: string
): PriceStatistics {
  const cleanCurrency = currency.toUpperCase();
  // Filter by currency
  const sameCurrency = observations.filter(
    (o) => o.currency.toUpperCase() === cleanCurrency
  );

  const now = new Date();
  if (sameCurrency.length === 0) {
    return {
      sampleCount: 0,
      windowDays: 0,
      startDate: now,
      endDate: now,
      minMinor: currentPriceMinor,
      maxMinor: currentPriceMinor,
      currentMinor: currentPriceMinor,
      medianMinor: currentPriceMinor,
      madMinor: 0,
      excludedOutlierCount: 0,
      isRobust: false,
      currency: cleanCurrency,
    };
  }

  // Sort chronologically
  const sortedByTime = [...sameCurrency].sort(
    (a, b) => a.sourceObservedAt.getTime() - b.sourceObservedAt.getTime()
  );

  const startDate = sortedByTime[0].sourceObservedAt;
  const endDate = sortedByTime[sortedByTime.length - 1].sourceObservedAt;
  const windowMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const windowDays = Math.max(1, Math.round(windowMs / (1000 * 3600 * 24)));

  const rawAmounts = sameCurrency.map((o) => o.amountMinor);
  const initialMedian = calculateMedian(rawAmounts);
  const mad = calculateMAD(rawAmounts, initialMedian);

  // Exclude observations beyond 3 MAD (Section 6.6)
  let cleanAmounts = rawAmounts;
  let excludedOutlierCount = 0;

  if (mad > 0) {
    cleanAmounts = rawAmounts.filter((amt) => {
      const dev = Math.abs(amt - initialMedian);
      if (dev > 3 * mad) {
        excludedOutlierCount++;
        return false;
      }
      return true;
    });
  }

  const finalMedian = calculateMedian(cleanAmounts);
  const minMinor = Math.min(...cleanAmounts, currentPriceMinor);
  const maxMinor = Math.max(...cleanAmounts, currentPriceMinor);

  // Section 6.6 Robust history definition:
  // At least 8 snapshots, spanning at least 7 days, all in the same currency
  const isRobust = cleanAmounts.length >= 8 && windowDays >= 7;

  return {
    sampleCount: cleanAmounts.length,
    windowDays,
    startDate,
    endDate,
    minMinor,
    maxMinor,
    currentMinor: currentPriceMinor,
    medianMinor: finalMedian,
    madMinor: mad,
    excludedOutlierCount,
    isRobust,
    currency: cleanCurrency,
  };
}

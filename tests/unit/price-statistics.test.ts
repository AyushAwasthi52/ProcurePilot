import { describe, it, expect } from "vitest";
import {
  calculateMedian,
  calculateMAD,
  computePriceStatistics,
} from "@/src/domain/pricing/statistics";
import { PriceObservation } from "@/src/domain/pricing/types";

describe("Price Statistics & MAD Outlier Filtering (Section 6.6)", () => {
  it("calculates accurate median for odd and even length number sets", () => {
    // Odd
    expect(calculateMedian([10, 20, 30])).toBe(20);
    // Even
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
  });

  it("calculates median absolute deviation (MAD)", () => {
    // Numbers: [10, 12, 14, 15, 16] -> median is 14
    // Deviations: [|10-14|=4, |12-14|=2, |14-14|=0, |15-14|=1, |16-14|=2]
    // Sorted deviations: [0, 1, 2, 2, 4] -> median is 2
    const nums = [10, 12, 14, 15, 16];
    const med = calculateMedian(nums);
    expect(med).toBe(14);
    expect(calculateMAD(nums, med)).toBe(2);
  });

  it("excludes outlier observations beyond 3 MAD (Section 6.6)", () => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;

    // 9 snapshots around $1,669 (span $1,629 to $1,709), plus 1 extreme outlier spike ($3,999)
    const observations: PriceObservation[] = [
      { offerId: "o1", amountMinor: 162900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 10 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 163900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 9 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 164900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 8 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 165900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 7 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 166900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 6 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 167900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 5 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 168900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 4 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 169900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 3 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 170900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 2 * day), ingestedAt: new Date(), source: "s1" },
      // Outlier
      { offerId: "o1", amountMinor: 399900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 1 * day), ingestedAt: new Date(), source: "s1" },
    ];

    const stats = computePriceStatistics(observations, 164900, "USD");
    expect(stats.excludedOutlierCount).toBe(1);
    expect(stats.sampleCount).toBe(9); // 10 - 1 = 9
    expect(stats.maxMinor).toBeLessThan(200000); // 399900 was excluded
  });

  it("identifies robust vs non-robust history", () => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;

    // Only 3 snapshots -> not robust
    const sparseObservations: PriceObservation[] = [
      { offerId: "o1", amountMinor: 164900, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 2 * day), ingestedAt: new Date(), source: "s1" },
      { offerId: "o1", amountMinor: 165000, currency: "USD", availability: "in_stock", sourceObservedAt: new Date(now - 1 * day), ingestedAt: new Date(), source: "s1" },
    ];
    const sparseStats = computePriceStatistics(sparseObservations, 164900, "USD");
    expect(sparseStats.isRobust).toBe(false);

    // 8 snapshots spanning 10 days -> robust
    const robustObservations: PriceObservation[] = Array.from({ length: 8 }).map((_, i) => ({
      offerId: "o1",
      amountMinor: 164900 + i * 100,
      currency: "USD",
      availability: "in_stock",
      sourceObservedAt: new Date(now - (10 - i) * day),
      ingestedAt: new Date(),
      source: "s1",
    }));
    const robustStats = computePriceStatistics(robustObservations, 164900, "USD");
    expect(robustStats.isRobust).toBe(true);
    expect(robustStats.sampleCount).toBe(8);
  });
});

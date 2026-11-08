import { describe, it, expect } from "vitest";
import { evaluateBuyAdvice } from "@/src/domain/pricing/rules";
import { PriceStatistics } from "@/src/domain/pricing/types";

describe("Price Advice Engine & Historic-Low Gate (Section 6.6)", () => {
  const baseStats: PriceStatistics = {
    sampleCount: 14,
    windowDays: 23,
    startDate: new Date("2026-10-09T00:00:00Z"),
    endDate: new Date("2026-11-07T00:00:00Z"),
    minMinor: 162900,
    maxMinor: 171900,
    currentMinor: 164900,
    medianMinor: 167900,
    madMinor: 2500,
    excludedOutlierCount: 0,
    isRobust: true,
    currency: "USD",
  };

  it("returns INSUFFICIENT_DATA when history is not robust", () => {
    const nonRobustStats: PriceStatistics = {
      ...baseStats,
      sampleCount: 4,
      windowDays: 3,
      isRobust: false,
    };

    const result = evaluateBuyAdvice(nonRobustStats, "normal");
    expect(result.advice).toBe("INSUFFICIENT_DATA");
    expect(result.isHistoricLow).toBe(false);
  });

  it("returns BUY_NOW when price is <= 97% of median", () => {
    // Current: 162800, Median: 167900 (162800 / 167900 = ~0.969 <= 0.97)
    const discountStats: PriceStatistics = {
      ...baseStats,
      currentMinor: 162800,
      medianMinor: 167900,
    };

    const result = evaluateBuyAdvice(discountStats, "normal");
    expect(result.advice).toBe("BUY_NOW");
    expect(result.headline).toContain("Reasonable to buy now");
  });

  it("returns BUY_NOW when urgency is urgent and price is <= 103% of median", () => {
    // Current: 169500, Median: 167900 (169500 / 167900 = ~1.009 <= 1.03)
    const urgentStats: PriceStatistics = {
      ...baseStats,
      currentMinor: 169500,
      medianMinor: 167900,
    };

    const result = evaluateBuyAdvice(urgentStats, "urgent");
    expect(result.advice).toBe("BUY_NOW");
  });

  it("returns WAIT when price is >= 105% of median and urgency is not urgent", () => {
    // Current: 177000, Median: 167900 (177000 / 167900 = ~1.054 >= 1.05)
    const expensiveStats: PriceStatistics = {
      ...baseStats,
      currentMinor: 177000,
      medianMinor: 167900,
    };

    const result = evaluateBuyAdvice(expensiveStats, "normal");
    expect(result.advice).toBe("WAIT");
    expect(result.headline).toContain("Consider waiting");
  });

  it("returns FAIR_PRICE otherwise", () => {
    // Current: 168000, Median: 167900 (price sits near median)
    const fairStats: PriceStatistics = {
      ...baseStats,
      currentMinor: 168000,
      medianMinor: 167900,
    };

    const result = evaluateBuyAdvice(fairStats, "normal");
    expect(result.advice).toBe("FAIR_PRICE");
  });

  it("refuses historic-low claim unless >= 20 snapshots over >= 60 days exist", () => {
    // Current price is at minimum ($1,629), BUT only 14 snapshots over 23 days -> NOT eligible
    const notQuiteHistoricLow: PriceStatistics = {
      ...baseStats,
      currentMinor: 162900,
      minMinor: 162900,
      sampleCount: 14,
      windowDays: 23,
    };
    const res1 = evaluateBuyAdvice(notQuiteHistoricLow, "normal");
    expect(res1.isHistoricLow).toBe(false);

    // Eligible: 25 snapshots over 65 days at minimum price
    const genuineHistoricLow: PriceStatistics = {
      ...baseStats,
      currentMinor: 162900,
      minMinor: 162900,
      sampleCount: 25,
      windowDays: 65,
    };
    const res2 = evaluateBuyAdvice(genuineHistoricLow, "normal");
    expect(res2.isHistoricLow).toBe(true);
  });
});


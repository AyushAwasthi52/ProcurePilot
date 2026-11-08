export type BuyAdvice =
  | "INSUFFICIENT_DATA"
  | "BUY_NOW"
  | "WAIT"
  | "FAIR_PRICE";

export interface PriceObservation {
  id?: string;
  offerId: string;
  amountMinor: number;
  currency: string;
  availability: string;
  sourceObservedAt: Date;
  ingestedAt: Date;
  source: string;
}

export interface PriceStatistics {
  sampleCount: number;
  windowDays: number;
  startDate: Date;
  endDate: Date;
  minMinor: number;
  maxMinor: number;
  currentMinor: number;
  medianMinor: number;
  madMinor: number;
  excludedOutlierCount: number;
  isRobust: boolean;
  currency: string;
}

export interface PriceAdviceResult {
  advice: BuyAdvice;
  headline: string;
  rationale: string;
  sampleStatement: string;
  isHistoricLow: boolean;
  statistics: PriceStatistics;
}

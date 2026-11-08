import {
  AvailabilityStatus,
  CostStatusType,
  RawOfferInput,
} from "@/src/domain/catalog/types";

export type { AvailabilityStatus, CostStatusType };
export type ProviderOffer = RawOfferInput;

export interface ProviderSearchInput {
  query: string;
  category?: string;
  region?: string;
  currency?: string;
  maxBudgetMinor?: number;
}

export interface ProviderSearchResult {
  providerId: string;
  offers: ProviderOffer[];
  latencyMs: number;
}

export interface ProviderHealth {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
}

export interface ProductProvider {
  id: string;
  name: string;
  search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult>;
  getOffer?(
    providerOfferId: string,
    signal: AbortSignal
  ): Promise<ProviderOffer | null>;
  healthCheck(): Promise<ProviderHealth>;
}

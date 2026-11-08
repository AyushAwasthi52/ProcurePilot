import { CheckoutCapability } from "./checkout-registry";

export type AvailabilityStatus = "in_stock" | "out_of_stock" | "unknown";
export type CostStatusType = "KNOWN" | "ESTIMATED" | "UNKNOWN";

export interface RawOfferInput {
  providerId: string;
  providerOfferId?: string;
  productTitle: string;
  brand?: string;
  description?: string;
  category?: string;
  attributes: Record<string, string | number | boolean | null | undefined>;
  merchantName: string;
  merchantId?: string;
  price: {
    amountMinor: number;
    currency: string;
  };
  shipping?: {
    status: CostStatusType;
    amountMinor?: number;
    currency?: string;
  };
  availability: AvailabilityStatus;
  productUrl: string;
  imageUrl?: string;
  sellerRating?: number;
  ratingCount?: number;
  returnPolicyUrl?: string;
  returnWindowDays?: number;
  warrantyText?: string;
  warrantyMonths?: number;
  observedAt: string; // ISO 8601
  rawSourceReference?: string;
  isDemo?: boolean;
}

export interface NormalizedProduct {
  id: string;
  canonicalKey: string;
  title: string;
  brand: string;
  category: string;
  attributes: Record<string, string | number | boolean | null | undefined>;
}

export interface NormalizedOffer {
  id: string;
  productId: string;
  productTitle: string;
  productBrand: string;
  productCategory: string;
  providerId: string;
  providerOfferId?: string;
  merchantId: string;
  merchantName: string;
  url: string;
  imageUrl?: string;
  priceMinor: number;
  currency: string;
  shippingStatus: CostStatusType;
  shippingMinor: number | null;
  taxStatus: CostStatusType;
  taxMinor: number | null;
  totalKnownMinor: number;
  availability: AvailabilityStatus;
  checkoutCapability: CheckoutCapability;
  sellerRating?: number;
  ratingCount?: number;
  warrantyMonths?: number | null;
  returnWindowDays?: number;
  attributes: Record<string, string | number | boolean | null | undefined>;
  sourceObservedAt: Date;
  ingestedAt: Date;
  isDemo: boolean;
  freshnessLabel?: string;
}

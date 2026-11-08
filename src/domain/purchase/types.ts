export type MustHaveOperator = "eq" | "gte" | "lte" | "in" | "exists";

export interface MustHaveConstraint {
  id?: string;
  attribute: string;
  operator: MustHaveOperator;
  value: string | number | boolean | string[];
  confirmed?: boolean;
  provenance?: "you-said" | "confirm" | "inferred";
  label?: string;
}

export interface PreferenceWeight {
  attribute: string;
  label?: string;
  weight: number;
  preferredValues?: string[];
}

export interface Budget {
  amountMinor: number | null;
  currency: string;
  includesShipping: boolean;
  isKnown?: boolean;
}

export interface Assumption {
  field: string;
  value: string;
  origin: "inferred" | "default";
}

export interface PurchaseBrief {
  category: string;
  query: string;
  useCases: string[];
  budget: Budget;
  mustHave: MustHaveConstraint[];
  preferences: PreferenceWeight[];
  excludedBrands?: string[];
  preferredBrands?: string[];
  region: string;
  quantity: number;
  urgency: "low" | "normal" | "urgent";
  assumptions: Assumption[];
  schemaVersion: 3;
}

export type PlanStatus =
  | "ACTIVE"
  | "SUPERSEDED"
  | "EXPIRED"
  | "APPROVED"
  | "CANCELLED";

export type CostStatus = "KNOWN" | "ESTIMATED" | "UNKNOWN";

export type CheckoutCapability = "DEMO_PAYPAL" | "MERCHANT_API" | "HANDOFF_ONLY";

export interface ItemSnapshot {
  title: string;
  brand: string;
  specs: Record<string, unknown>;
  merchantId: string;
  merchantName: string;
  merchantType?: "direct" | "marketplace" | "authorized_dealer" | "reseller";
  url: string;
  warrantyMonths?: number | null;
  returnWindowDays?: number | null;
  productSlug?: string;
  attributes?: Record<string, unknown>;
}

export interface CanonicalPlanFields {
  planId: string;
  version: number;
  offerId: string;
  merchantId: string;
  itemSnapshot: ItemSnapshot;
  quantity: number;
  itemMinor: number;
  shippingStatus: CostStatus;
  shippingMinor: number | null;
  taxStatus: CostStatus;
  taxMinor: number | null;
  totalKnownMinor: number;
  currency: string;
  expiresAt: string; // ISO 8601 string for canonical serialization
}

export interface PurchasePlan {
  id: string;
  userId: string;
  requestId: string;
  offerId: string;
  version: number;
  itemSnapshot: ItemSnapshot;
  quantity: number;
  itemMinor: number;
  shippingStatus: CostStatus;
  shippingMinor: number | null;
  taxStatus: CostStatus;
  taxMinor: number | null;
  totalKnownMinor: number;
  currency: string;
  planHash: string;
  status: PlanStatus;
  checkoutCapability: CheckoutCapability;
  expiresAt: Date;
  supersededById?: string | null;
  reverifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Approval {
  id: string;
  planId: string;
  userId: string;
  planHash: string;
  approvedAmountMinor: number;
  approvedCurrency: string;
  acknowledgedUnverified?: string[];
  status: "APPROVED" | "REVOKED";
  approvedAt: Date;
  revokedAt?: Date | null;
}

export interface PlanApprovalSubmission {
  planId: string;
  planHash: string;
  approvedAmountMinor: number;
  approvedCurrency: string;
  acknowledgedUnverified?: string[];
}



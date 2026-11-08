import { createHash } from "node:crypto";
import {
  CanonicalPlanFields,
  CheckoutCapability,
  CostStatus,
  ItemSnapshot,
  PurchasePlan,
} from "./types";

export const PLAN_TTL_SECONDS = 600; // 10 minutes (Section 7.2 & ADR-004)

export function canonicalJsonStringify(val: unknown): string {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`
  );
  return `{${pairs.join(",")}}`;
}

export function calculatePlanHash(fields: CanonicalPlanFields): string {
  const canonicalJson = canonicalJsonStringify(fields);
  return createHash("sha256").update(canonicalJson).digest("hex");
}

export function extractCanonicalPlanFields(
  plan: Pick<
    PurchasePlan,
    | "id"
    | "version"
    | "offerId"
    | "itemSnapshot"
    | "quantity"
    | "itemMinor"
    | "shippingStatus"
    | "shippingMinor"
    | "taxStatus"
    | "taxMinor"
    | "totalKnownMinor"
    | "currency"
    | "expiresAt"
  >
): CanonicalPlanFields {
  return {
    planId: plan.id,
    version: plan.version,
    offerId: plan.offerId,
    merchantId: plan.itemSnapshot.merchantId,
    itemSnapshot: plan.itemSnapshot,
    quantity: plan.quantity,
    itemMinor: plan.itemMinor,
    shippingStatus: plan.shippingStatus,
    shippingMinor: plan.shippingMinor,
    taxStatus: plan.taxStatus,
    taxMinor: plan.taxMinor,
    totalKnownMinor: plan.totalKnownMinor,
    currency: plan.currency.toUpperCase(),
    expiresAt: plan.expiresAt instanceof Date ? plan.expiresAt.toISOString() : new Date(plan.expiresAt).toISOString(),
  };
}

export function verifyPlanHash(plan: PurchasePlan): boolean {
  const fields = extractCanonicalPlanFields(plan);
  const expectedHash = calculatePlanHash(fields);
  return plan.planHash === expectedHash;
}

export function isPlanExpired(plan: PurchasePlan, asOf: Date = new Date()): boolean {
  const expiryTime = plan.expiresAt instanceof Date ? plan.expiresAt.getTime() : new Date(plan.expiresAt).getTime();
  return asOf.getTime() >= expiryTime;
}

export interface BuildPurchasePlanInput {
  id?: string;
  userId: string;
  requestId: string;
  offerId: string;
  version?: number;
  itemSnapshot: ItemSnapshot;
  quantity?: number;
  itemMinor: number;
  shippingStatus?: CostStatus;
  shippingMinor?: number | null;
  taxStatus?: CostStatus;
  taxMinor?: number | null;
  currency: string;
  checkoutCapability?: CheckoutCapability;
  createdAt?: Date;
  ttlSeconds?: number;
}

export function buildPurchasePlan(input: BuildPurchasePlanInput): PurchasePlan {
  const now = input.createdAt ?? new Date();
  const ttl = input.ttlSeconds ?? PLAN_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttl * 1000);
  const quantity = input.quantity ?? 1;
  const version = input.version ?? 1;
  const planId = input.id ?? `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const shippingStatus = input.shippingStatus ?? "KNOWN";
  const shippingMinor = input.shippingMinor ?? 0;
  const taxStatus = input.taxStatus ?? "UNKNOWN";
  const taxMinor = input.taxMinor ?? null;

  // Server-computed landed cost (minor units integer only)
  const itemTotal = input.itemMinor * quantity;
  const shippingTotal = shippingMinor ? shippingMinor * quantity : 0;
  const taxTotal = taxMinor ? taxMinor * quantity : 0;
  const totalKnownMinor = itemTotal + shippingTotal + taxTotal;

  const currency = input.currency.toUpperCase();
  const checkoutCapability = input.checkoutCapability ?? "HANDOFF_ONLY";

  const canonicalFields: CanonicalPlanFields = {
    planId,
    version,
    offerId: input.offerId,
    merchantId: input.itemSnapshot.merchantId,
    itemSnapshot: input.itemSnapshot,
    quantity,
    itemMinor: input.itemMinor,
    shippingStatus,
    shippingMinor,
    taxStatus,
    taxMinor,
    totalKnownMinor,
    currency,
    expiresAt: expiresAt.toISOString(),
  };

  const planHash = calculatePlanHash(canonicalFields);

  return {
    id: planId,
    userId: input.userId,
    requestId: input.requestId,
    offerId: input.offerId,
    version,
    itemSnapshot: input.itemSnapshot,
    quantity,
    itemMinor: input.itemMinor,
    shippingStatus,
    shippingMinor,
    taxStatus,
    taxMinor,
    totalKnownMinor,
    currency,
    planHash,
    status: "ACTIVE",
    checkoutCapability,
    expiresAt,
    supersededById: null,
    reverifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export interface ReverifyResult {
  valid: boolean;
  priceChanged: boolean;
  stockAvailable: boolean;
  oldPriceMinor: number;
  newPriceMinor: number;
  message?: string;
}

export function reverifyOffer(
  plan: PurchasePlan,
  currentOffer: {
    priceMinor: number;
    availability: string;
    currency: string;
  }
): ReverifyResult {
  const stockAvailable = currentOffer.availability === "in_stock";
  const priceChanged = currentOffer.priceMinor !== plan.itemMinor;

  if (!stockAvailable) {
    return {
      valid: false,
      priceChanged,
      stockAvailable: false,
      oldPriceMinor: plan.itemMinor,
      newPriceMinor: currentOffer.priceMinor,
      message: "The item is no longer in stock with this seller.",
    };
  }

  if (priceChanged) {
    return {
      valid: false,
      priceChanged: true,
      stockAvailable: true,
      oldPriceMinor: plan.itemMinor,
      newPriceMinor: currentOffer.priceMinor,
      message: `The price has changed from $${(plan.itemMinor / 100).toFixed(2)} to $${(currentOffer.priceMinor / 100).toFixed(2)} ${plan.currency}.`,
    };
  }

  return {
    valid: true,
    priceChanged: false,
    stockAvailable: true,
    oldPriceMinor: plan.itemMinor,
    newPriceMinor: currentOffer.priceMinor,
  };
}


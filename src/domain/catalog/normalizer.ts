import { RawOfferInput, NormalizedOffer } from "./types";
import { CheckoutCapabilityRegistry } from "./checkout-registry";

export function generateCanonicalKey(brand?: string, title?: string): string {
  const b = (brand || "generic")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const t = (title || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${b}-${t}`;
}

export function formatFreshnessLabel(observedAt: Date): string {
  const diffMs = Date.now() - observedAt.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) {
    return `refreshed ${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `refreshed ${diffMin} min ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  return `observed ${diffHr} hr ago`;
}

export function normalizeProviderOffer(
  raw: RawOfferInput,
  index = 0
): NormalizedOffer {
  const merchantId = raw.merchantId || `mer_${raw.merchantName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  const capability = CheckoutCapabilityRegistry.getCapability(
    merchantId,
    raw.merchantName
  );

  const shippingStatus = raw.shipping?.status ?? "UNKNOWN";
  const shippingMinor =
    shippingStatus === "KNOWN" && raw.shipping?.amountMinor !== undefined
      ? raw.shipping.amountMinor
      : null;

  // Total known cost = item price + known shipping (tax is UNKNOWN by default in MVP)
  const totalKnownMinor =
    raw.price.amountMinor + (shippingMinor !== null ? shippingMinor : 0);

  const observedDate = new Date(raw.observedAt);
  const ingestedDate = new Date();

  const id = raw.providerOfferId || `ofr_${raw.providerId}_${index}_${Date.now()}`;

  return {
    id,
    productId: generateCanonicalKey(raw.brand, raw.productTitle),
    productTitle: raw.productTitle,
    productBrand: raw.brand || "Brand",
    productCategory: raw.category || "Laptop",
    providerId: raw.providerId,
    providerOfferId: raw.providerOfferId,
    merchantId,
    merchantName: raw.merchantName,
    url: raw.productUrl,
    imageUrl: raw.imageUrl,
    priceMinor: raw.price.amountMinor,
    currency: raw.price.currency.toUpperCase(),
    shippingStatus,
    shippingMinor,
    taxStatus: "UNKNOWN",
    taxMinor: null,
    totalKnownMinor,
    availability: raw.availability,
    checkoutCapability: capability,
    sellerRating: raw.sellerRating,
    ratingCount: raw.ratingCount,
    warrantyMonths:
      raw.warrantyMonths !== undefined
        ? raw.warrantyMonths
        : (raw.attributes.warrantyMonths as number | undefined) ?? null,
    returnWindowDays:
      raw.returnWindowDays !== undefined
        ? raw.returnWindowDays
        : (raw.attributes.returnWindowDays as number | undefined),
    attributes: raw.attributes,
    sourceObservedAt: observedDate,
    ingestedAt: ingestedDate,
    isDemo: !!raw.isDemo,
    freshnessLabel: formatFreshnessLabel(observedDate),
  };
}

export function deduplicateOffers(offers: NormalizedOffer[]): NormalizedOffer[] {
  const seenKeys = new Set<string>();
  const result: NormalizedOffer[] = [];

  for (const offer of offers) {
    // Unique key: providerId + providerOfferId, or url
    const uniqueKey =
      offer.providerOfferId && offer.providerOfferId.length > 0
        ? `${offer.providerId}:${offer.providerOfferId}`
        : `${offer.merchantId}:${offer.url}`;

    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      result.push(offer);
    }
  }

  return result;
}

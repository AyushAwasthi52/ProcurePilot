import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
  AvailabilityStatus,
} from "../types";
import { SEED_DATA } from "@/prisma/seed";

export class SeededDemoCatalogAdapter implements ProductProvider {
  id = "seeded_demo";
  name = "Seeded demo catalog";

  async search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const start = Date.now();

    if (signal.aborted) {
      throw new Error("Search aborted by user");
    }

    const offers: ProviderOffer[] = [];

    // Query seeded products and extract demo offers
    for (const prod of SEED_DATA.products) {
      for (const off of prod.offers) {
        if (off.providerId === "demo_catalog") {
          const offAttr = off.attributes as Record<string, unknown>;
          offers.push({
            providerId: this.id,
            providerOfferId: off.providerOfferId,
            productTitle: prod.title,
            brand: prod.brand,
            category: prod.category,
            attributes: {
              ...prod.attributes,
              ...off.attributes,
            },
            merchantName: off.merchantName,
            merchantId: off.merchantId,
            price: {
              amountMinor: off.priceMinor,
              currency: off.currency,
            },
            shipping: {
              status: off.shippingStatus,
              amountMinor: off.shippingMinor ?? undefined,
              currency: off.currency,
            },
            availability: off.availability as AvailabilityStatus,
            productUrl: off.url,
            sellerRating: typeof offAttr.sellerRating === "number" ? offAttr.sellerRating : undefined,
            ratingCount: typeof offAttr.ratingCount === "number" ? offAttr.ratingCount : undefined,
            warrantyMonths: typeof offAttr.warrantyMonths === "number" ? offAttr.warrantyMonths : undefined,
            returnWindowDays: typeof offAttr.returnWindowDays === "number" ? offAttr.returnWindowDays : undefined,
            observedAt: new Date().toISOString(),
            isDemo: true,
          });
        }
      }
    }

    return {
      providerId: this.id,
      offers,
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      healthy: true,
      latencyMs: 5,
    };
  }
}

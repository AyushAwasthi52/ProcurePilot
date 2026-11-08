import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
  AvailabilityStatus,
} from "../types";
import { SEED_DATA } from "@/prisma/seed";

export class CatalogProviderBAdapter implements ProductProvider {
  id = "provider_b";
  name = "Catalog provider B";
  shouldTimeout = false;

  constructor(options?: { shouldTimeout?: boolean }) {
    if (options?.shouldTimeout !== undefined) {
      this.shouldTimeout = options.shouldTimeout;
    }
  }

  async search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const start = Date.now();

    if (signal.aborted) {
      throw new Error("Search aborted by user");
    }

    if (this.shouldTimeout) {
      await new Promise<void>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Provider B timed out after 6 s"));
        }, 100);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("Search aborted by user"));
        });
      });
    }

    const offers: ProviderOffer[] = [];

    // Filter provider_b offers
    for (const prod of SEED_DATA.products) {
      for (const off of prod.offers) {
        if (off.providerId === "provider_b") {
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
            observedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            isDemo: false,
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
      healthy: !this.shouldTimeout,
      latencyMs: 40,
    };
  }
}

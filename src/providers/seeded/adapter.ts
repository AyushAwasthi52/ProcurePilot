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
  kind = "DEMO" as const;

  isConfigured(): boolean {
    return true;
  }

  async search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const start = Date.now();

    if (signal.aborted) {
      throw new Error("Search aborted by user");
    }

    const offers: ProviderOffer[] = [];
    const queryLower = (input.query || "").toLowerCase();
    const targetCat = input.category ? input.category.toLowerCase().trim() : undefined;
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    // Query seeded products and extract matching demo offers
    for (const prod of SEED_DATA.products) {
      const prodCat = (prod.category || "").toLowerCase().trim();
      const prodTitle = prod.title.toLowerCase();
      const prodBrand = prod.brand.toLowerCase();

      // 1. Category filter: If category provided and not general, enforce exact category
      if (targetCat && targetCat !== "general") {
        if (prodCat !== targetCat && !targetCat.includes(prodCat) && !prodCat.includes(targetCat)) {
          continue;
        }
      }

      // 2. Query filter: if query words provided, at least one meaningful token must match
      if (queryWords.length > 0) {
        const matchesQuery = queryWords.some(
          (w) =>
            prodTitle.includes(w) ||
            prodBrand.includes(w) ||
            prodCat.includes(w) ||
            (targetCat && w.includes(targetCat))
        );
        if (!matchesQuery && targetCat !== prodCat) {
          continue;
        }
      }

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
      isConfigured: true,
      kind: "DEMO",
      message: "Seeded local catalog ready",
      latencyMs: 5,
    };
  }
}

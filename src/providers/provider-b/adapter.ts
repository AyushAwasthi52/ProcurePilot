import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
} from "../types";

// Distinct external partner B catalog items (includes TR-02 anomaly offer for trust testing)
const PARTNER_B_CATALOG_OFFERS: ProviderOffer[] = [
  {
    providerId: "provider_b",
    providerOfferId: "ofr_pb_lumen16_anomaly",
    productTitle: "Lumen Aero 16",
    brand: "Lumen",
    category: "Laptop",
    attributes: {
      ramGb: 32,
      storageGb: 1024,
      gpu: "NVIDIA GeForce RTX 4060",
      identityVerified: false, // TR-01 failure
      warrantyMonths: null,
      sellerRating: 2.1,
      ratingCount: 3,
    },
    merchantName: "Unknown Merchant 9482",
    merchantId: "mer_unverified",
    price: {
      amountMinor: 89900, // 45% below comparable median (TR-02 anomaly)
      currency: "USD",
    },
    shipping: {
      status: "UNKNOWN",
    },
    availability: "in_stock",
    productUrl: "https://shady-bargains.example/lumen-aero-16",
    sellerRating: 2.1,
    ratingCount: 3,
    observedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    isDemo: false,
  },
  {
    providerId: "provider_b",
    providerOfferId: "ofr_pb_bose_qc",
    productTitle: "Bose QuietComfort Ultra Wireless Headphones",
    brand: "Bose",
    category: "Headphones",
    attributes: {
      anc: true,
      batteryHours: 24,
      wireless: true,
      multipointBluetooth: true,
      formFactor: "over-ear",
      warrantyMonths: 24,
      returnWindowDays: 30,
      sellerRating: 4.7,
      ratingCount: 1540,
      identityVerified: true,
    },
    merchantName: "Northgate Direct",
    merchantId: "mer_northgate",
    price: {
      amountMinor: 37900,
      currency: "USD",
    },
    shipping: {
      status: "KNOWN",
      amountMinor: 0,
      currency: "USD",
    },
    availability: "in_stock",
    productUrl: "https://northgate.example/bose-qc-ultra",
    sellerRating: 4.7,
    ratingCount: 1540,
    warrantyMonths: 24,
    returnWindowDays: 30,
    observedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    isDemo: false,
  },
];

export class CatalogProviderBAdapter implements ProductProvider {
  id = "provider_b";
  name = "Catalog provider B";
  shouldTimeout = false;

  constructor(options?: {
    apiKey?: string;
    endpoint?: string;
    shouldTimeout?: boolean;
  }) {
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

    const queryLower = (input.query || "").toLowerCase();
    const targetCat = input.category ? input.category.toLowerCase().trim() : undefined;
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    const matchedOffers = PARTNER_B_CATALOG_OFFERS.filter((o) => {
      const oCat = (o.category || "").toLowerCase();
      const oTitle = o.productTitle.toLowerCase();
      const oBrand = (o.brand || "").toLowerCase();

      if (targetCat && targetCat !== "general") {
        if (oCat !== targetCat && !targetCat.includes(oCat) && !oCat.includes(targetCat)) {
          return false;
        }
      }

      if (queryWords.length > 0) {
        return queryWords.some(
          (w) =>
            oTitle.includes(w) ||
            oBrand.includes(w) ||
            oCat.includes(w) ||
            (targetCat && w.includes(targetCat))
        );
      }

      return targetCat ? oCat === targetCat : true;
    });

    return {
      providerId: this.id,
      offers: matchedOffers,
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

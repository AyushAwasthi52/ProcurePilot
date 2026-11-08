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

    const queryLower = input.query.toLowerCase();
    const matchedOffers = PARTNER_B_CATALOG_OFFERS.filter(
      (o) =>
        o.productTitle.toLowerCase().includes(queryLower) ||
        (o.category ? o.category.toLowerCase().includes(queryLower) : false) ||
        queryLower.includes("laptop") ||
        queryLower.includes("programming") ||
        queryLower.includes("ml")
    );

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

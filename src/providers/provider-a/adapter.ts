import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
} from "../types";

// Distinct external partner A catalog items (independent of seeded first-party demo store)
const PARTNER_A_CATALOG_OFFERS: ProviderOffer[] = [
  {
    providerId: "provider_a",
    providerOfferId: "ofr_pa_vec16_brightline",
    productTitle: "Halden Vector 16",
    brand: "Halden",
    category: "Laptop",
    attributes: {
      ramGb: 32,
      ramSlots: 2,
      ramUpgradeable: true,
      storageGb: 1024,
      gpu: "NVIDIA GeForce RTX 4070 (CUDA)",
      gpuDedicated: true,
      cudaSupport: true,
      screenSizeInches: 16,
      thermalsScore: 92,
      batteryLifeHours: 8,
      warrantyMonths: 36,
      returnWindowDays: 30,
      sellerRating: 4.7,
      ratingCount: 1240,
      identityVerified: true,
    },
    merchantName: "Brightline Electronics",
    merchantId: "mer_brightline",
    price: {
      amountMinor: 164900,
      currency: "USD",
    },
    shipping: {
      status: "KNOWN",
      amountMinor: 0,
      currency: "USD",
    },
    availability: "in_stock",
    productUrl: "https://brightline.example/products/halden-vector-16",
    sellerRating: 4.7,
    ratingCount: 1240,
    warrantyMonths: 36,
    returnWindowDays: 30,
    observedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    isDemo: false,
  },
  {
    providerId: "provider_a",
    providerOfferId: "ofr_pa_atlas15_valuehub",
    productTitle: "Orbis Atlas 15",
    brand: "Orbis",
    category: "Laptop",
    attributes: {
      ramGb: 16,
      ramSlots: 2,
      ramUpgradeable: true,
      storageGb: 512,
      gpu: "NVIDIA GeForce RTX 4050",
      gpuDedicated: true,
      cudaSupport: true,
      screenSizeInches: 15.6,
      thermalsScore: 78,
      batteryLifeHours: 7,
      warrantyMonths: null, // UNVERIFIED constraint
      returnWindowDays: 14,
      sellerRating: 4.1,
      ratingCount: 310,
      identityVerified: true,
    },
    merchantName: "ValueHub",
    merchantId: "mer_valuehub",
    price: {
      amountMinor: 147900,
      currency: "USD",
    },
    shipping: {
      status: "UNKNOWN",
    },
    availability: "in_stock",
    productUrl: "https://valuehub.example/orbis-atlas-15",
    sellerRating: 4.1,
    ratingCount: 310,
    observedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isDemo: false,
  },
  {
    providerId: "provider_a",
    providerOfferId: "ofr_pa_sony_xm5",
    productTitle: "Sony WH-1000XM5 Wireless Noise-Cancelling Headphones",
    brand: "Sony",
    category: "Headphones",
    attributes: {
      anc: true,
      batteryHours: 30,
      wireless: true,
      multipointBluetooth: true,
      formFactor: "over-ear",
      warrantyMonths: 24,
      returnWindowDays: 30,
      sellerRating: 4.8,
      ratingCount: 3120,
      identityVerified: true,
    },
    merchantName: "Brightline Electronics",
    merchantId: "mer_brightline",
    price: {
      amountMinor: 34900,
      currency: "USD",
    },
    shipping: {
      status: "KNOWN",
      amountMinor: 0,
      currency: "USD",
    },
    availability: "in_stock",
    productUrl: "https://brightline.example/sony-wh-1000xm5",
    sellerRating: 4.8,
    ratingCount: 3120,
    warrantyMonths: 24,
    returnWindowDays: 30,
    observedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    isDemo: false,
  },
  {
    providerId: "provider_a",
    providerOfferId: "ofr_pa_pixel9pro",
    productTitle: "Google Pixel 9 Pro 128GB",
    brand: "Google",
    category: "Smartphone",
    attributes: {
      os: "Android",
      storageGb: 128,
      screenInches: 6.3,
      cameraScore: 95,
      batteryMah: 4700,
      warrantyMonths: 24,
      returnWindowDays: 30,
      sellerRating: 4.8,
      ratingCount: 1450,
      identityVerified: true,
    },
    merchantName: "Brightline Electronics",
    merchantId: "mer_brightline",
    price: {
      amountMinor: 99900,
      currency: "USD",
    },
    shipping: {
      status: "KNOWN",
      amountMinor: 0,
      currency: "USD",
    },
    availability: "in_stock",
    productUrl: "https://brightline.example/pixel-9-pro",
    sellerRating: 4.8,
    ratingCount: 1450,
    warrantyMonths: 24,
    returnWindowDays: 30,
    observedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    isDemo: false,
  },
];

export class CatalogProviderAAdapter implements ProductProvider {
  id = "provider_a";
  name = "Catalog provider A";

  constructor(
    private apiKey?: string,
    private endpoint?: string
  ) {}

  async search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const start = Date.now();

    if (signal.aborted) {
      throw new Error("Search aborted by user");
    }

    // If live API credentials are configured, query permitted live partner API
    if (this.apiKey && this.endpoint) {
      const url = new URL(this.endpoint);
      url.searchParams.set("q", input.query);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal,
      });

      if (!res.ok) {
        throw new Error(`Provider A API failed with status ${res.status}`);
      }

      const data = await res.json();
      return {
        providerId: this.id,
        offers: data.offers ?? [],
        latencyMs: Date.now() - start,
      };
    }

    // Bounded simulation delay (30ms) for external network roundtrip
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), 30);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Search aborted by user"));
      });
    });

    const queryLower = (input.query || "").toLowerCase();
    const targetCat = input.category ? input.category.toLowerCase().trim() : undefined;
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    const matchedOffers = PARTNER_A_CATALOG_OFFERS.filter((o) => {
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
      healthy: true,
      latencyMs: 30,
    };
  }
}

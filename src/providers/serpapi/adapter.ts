import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
  AvailabilityStatus,
  CostStatusType,
} from "../types";

export interface SerpApiAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
}

interface SerpApiShoppingItem {
  position?: number;
  title?: string;
  link?: string;
  product_link?: string;
  product_id?: string | number;
  source?: string;
  price?: string;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  delivery?: string;
  extensions?: string[];
  tag?: string;
}

interface SerpApiResponse {
  search_metadata?: {
    status?: string;
    total_time_taken?: number;
  };
  shopping_results?: SerpApiShoppingItem[];
  error?: string;
}

export class SerpApiGoogleShoppingAdapter implements ProductProvider {
  id = "serpapi_google_shopping";
  name = "Google Shopping (SerpApi)";
  kind = "LIVE" as const;

  private apiKey?: string;
  private baseUrl: string;

  constructor(options?: SerpApiAdapterOptions) {
    this.apiKey = options?.apiKey;
    this.baseUrl = options?.baseUrl || "https://serpapi.com/search.json";
  }

  isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim().length > 0 &&
      this.apiKey !== "mock_key" &&
      this.apiKey !== "your_secret_here"
    );
  }

  async search(
    input: ProviderSearchInput,
    signal: AbortSignal
  ): Promise<ProviderSearchResult> {
    const start = Date.now();

    if (!this.isConfigured()) {
      return {
        providerId: this.id,
        offers: [],
        latencyMs: Date.now() - start,
      };
    }

    if (signal.aborted) {
      throw new Error("Search aborted by user");
    }

    // Geographic targeting
    const region = (input.region || "US").toUpperCase();
    const currency = input.currency || (region === "IN" ? "INR" : "USD");

    let gl = "us";
    let location = "United States";
    if (region === "IN" || currency === "INR") {
      gl = "in";
      location = "India";
    } else if (region === "UK" || region === "GB" || currency === "GBP") {
      gl = "uk";
      location = "United Kingdom";
    } else if (region === "CA" || currency === "CAD") {
      gl = "ca";
      location = "Canada";
    } else if (region === "DE" || currency === "EUR") {
      gl = "de";
      location = "Germany";
    }

    const searchParams = new URLSearchParams({
      engine: "google_shopping",
      q: input.query,
      gl,
      hl: "en",
      location,
      api_key: this.apiKey!,
    });

    const requestUrl = `${this.baseUrl}?${searchParams.toString()}`;

    const res = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid SerpApi API key");
    }

    if (res.status === 429) {
      throw new Error("SerpApi rate limit exceeded");
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(
        `SerpApi request failed with status ${res.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const data: SerpApiResponse = await res.json();

    if (data.error) {
      throw new Error(`SerpApi error: ${data.error}`);
    }

    const items = data.shopping_results || [];
    const offers: ProviderOffer[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title) continue;

      // Extract price
      const itemCurrency = this.detectCurrency(item.price, currency);
      const amountMinor = this.parsePriceMinor(
        item.price,
        item.extracted_price,
        itemCurrency
      );

      if (amountMinor === null) {
        continue; // Cannot evaluate offer without price
      }

      // Parse shipping honestly (do NOT assume 0 without evidence)
      const shipping = this.parseShipping(item.delivery, itemCurrency);

      // Stock status (never assume in_stock without evidence)
      let availability: AvailabilityStatus = "unknown";
      const extensionsLower = (item.extensions || []).join(" ").toLowerCase();
      if (
        extensionsLower.includes("in stock") ||
        item.tag?.toLowerCase().includes("in stock")
      ) {
        availability = "in_stock";
      } else if (
        extensionsLower.includes("out of stock") ||
        item.tag?.toLowerCase().includes("out of stock")
      ) {
        availability = "out_of_stock";
      }

      const offerUrl = item.link || item.product_link || "";
      const merchantName = item.source || "Google Shopping Merchant";

      offers.push({
        providerId: this.id,
        providerOfferId: item.product_id
          ? String(item.product_id)
          : `serp_${i}_${Date.now()}`,
        productTitle: item.title,
        merchantName,
        merchantId: merchantName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        price: {
          amountMinor,
          currency: itemCurrency,
        },
        shipping,
        availability,
        productUrl: offerUrl,
        imageUrl: item.thumbnail,
        sellerRating: typeof item.rating === "number" ? item.rating : undefined,
        ratingCount: typeof item.reviews === "number" ? item.reviews : undefined,
        attributes: {},
        observedAt: new Date().toISOString(),
        rawSourceReference: "serpapi:google_shopping",
        isDemo: false,
      });
    }

    return {
      providerId: this.id,
      offers,
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    const isConfigured = this.isConfigured();
    return {
      healthy: isConfigured,
      isConfigured,
      kind: isConfigured ? "LIVE" : "UNCONFIGURED",
      message: isConfigured
        ? "SerpApi Google Shopping adapter configured"
        : "SERPAPI_API_KEY is not configured",
    };
  }

  private detectCurrency(priceStr?: string, fallbackCurrency = "USD"): string {
    if (!priceStr) return fallbackCurrency;
    if (priceStr.includes("₹") || /inr|rs\.?/i.test(priceStr)) return "INR";
    if (priceStr.includes("€") || /eur/i.test(priceStr)) return "EUR";
    if (priceStr.includes("£") || /gbp/i.test(priceStr)) return "GBP";
    if (priceStr.includes("$") || /usd/i.test(priceStr)) return "USD";
    return fallbackCurrency;
  }

  private parsePriceMinor(
    priceStr?: string,
    extractedPrice?: number,
    currency = "USD"
  ): number | null {
    if (typeof extractedPrice === "number" && extractedPrice > 0) {
      return Math.round(extractedPrice * (currency === "JPY" ? 1 : 100));
    }

    if (priceStr) {
      const match = priceStr.match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(num) && num > 0) {
          return Math.round(num * (currency === "JPY" ? 1 : 100));
        }
      }
    }

    return null;
  }

  private parseShipping(
    deliveryStr?: string,
    currency = "USD"
  ): { status: CostStatusType; amountMinor?: number; currency?: string } {
    if (!deliveryStr || deliveryStr.trim().length === 0) {
      return { status: "UNKNOWN" };
    }

    const lower = deliveryStr.toLowerCase();
    if (
      lower.includes("free") ||
      lower.includes("free delivery") ||
      lower.includes("free shipping")
    ) {
      return {
        status: "KNOWN",
        amountMinor: 0,
        currency,
      };
    }

    // Extract delivery amount e.g. "₹99 delivery" or "$4.99 shipping"
    const match = deliveryStr.match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
    if (match) {
      const parsedNum = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(parsedNum) && parsedNum > 0) {
        return {
          status: "KNOWN",
          amountMinor: Math.round(parsedNum * (currency === "JPY" ? 1 : 100)),
          currency,
        };
      }
    }

    return { status: "UNKNOWN" };
  }
}


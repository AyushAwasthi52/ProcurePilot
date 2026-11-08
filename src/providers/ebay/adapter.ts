import {
  ProductProvider,
  ProviderSearchInput,
  ProviderSearchResult,
  ProviderOffer,
  ProviderHealth,
  AvailabilityStatus,
  CostStatusType,
} from "../types";

export interface EBayAdapterOptions {
  clientId?: string;
  clientSecret?: string;
  env?: "sandbox" | "production";
  marketplaceId?: string;
  oauthBaseUrl?: string;
  apiBaseUrl?: string;
}

interface EBayTokenCache {
  token: string;
  expiresAt: number;
}

interface EBayItemSummary {
  itemId: string;
  title: string;
  price?: {
    value: string;
    currency: string;
  };
  seller?: {
    username?: string;
    feedbackPercentage?: string;
    feedbackScore?: number;
  };
  itemWebUrl?: string;
  image?: {
    imageUrl?: string;
  };
  shippingOptions?: Array<{
    shippingCostType?: string;
    shippingCost?: {
      value?: string;
      currency?: string;
    };
  }>;
  condition?: string;
}

interface EBaySearchResponse {
  total?: number;
  itemSummaries?: EBayItemSummary[];
  warnings?: Array<{ message: string }>;
  errors?: Array<{ message: string }>;
}

export class EBayBrowseAdapter implements ProductProvider {
  id = "ebay_browse";
  name = "eBay Browse API";
  kind = "LIVE" as const;

  private clientId?: string;
  private clientSecret?: string;
  private env: "sandbox" | "production";
  private marketplaceId: string;
  private oauthBaseUrl: string;
  private apiBaseUrl: string;
  private tokenCache: EBayTokenCache | null = null;

  constructor(options?: EBayAdapterOptions) {
    this.clientId = options?.clientId;
    this.clientSecret = options?.clientSecret;
    this.env = options?.env || "production";
    this.marketplaceId = options?.marketplaceId || "EBAY_US";

    this.oauthBaseUrl =
      options?.oauthBaseUrl ||
      (this.env === "sandbox"
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com");

    this.apiBaseUrl =
      options?.apiBaseUrl ||
      (this.env === "sandbox"
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com");
  }

  isConfigured(): boolean {
    return Boolean(
      this.clientId &&
      this.clientSecret &&
      this.clientId.trim().length > 0 &&
      this.clientSecret.trim().length > 0 &&
      this.clientId !== "mock_key" &&
      this.clientId !== "your_secret_here"
    );
  }

  async getAccessToken(signal?: AbortSignal): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("eBay client credentials are not configured");
    }

    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.token;
    }

    const authHeader = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    const endpoint = `${this.oauthBaseUrl}/identity/v1/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`,
      },
      body: body.toString(),
      signal,
    });

    if (res.status === 400 || res.status === 401) {
      throw new Error("Invalid eBay client credentials");
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(
        `eBay OAuth token request failed (${res.status}): ${errorText.slice(0, 200)}`
      );
    }

    const data = await res.json();
    const accessToken = data.access_token;
    const expiresIn = Number(data.expires_in) || 7200;

    if (!accessToken) {
      throw new Error("No access_token returned by eBay OAuth endpoint");
    }

    this.tokenCache = {
      token: accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return accessToken;
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

    const token = await this.getAccessToken(signal);

    const region = (input.region || "US").toUpperCase();
    let marketplace = this.marketplaceId;
    if (region === "IN" || input.currency === "INR") {
      marketplace = "EBAY_IN";
    } else if (region === "UK" || region === "GB" || input.currency === "GBP") {
      marketplace = "EBAY_GB";
    } else if (region === "DE" || input.currency === "EUR") {
      marketplace = "EBAY_DE";
    } else if (region === "CA" || input.currency === "CAD") {
      marketplace = "EBAY_CA";
    }

    const searchUrl = `${this.apiBaseUrl}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(
      input.query
    )}&limit=10`;

    let res = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplace,
        Accept: "application/json",
      },
      signal,
    });

    // Token invalidation and 1-time retry on 401 Unauthorized
    if (res.status === 401) {
      this.tokenCache = null;
      const freshToken = await this.getAccessToken(signal);
      res = await fetch(searchUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "X-EBAY-C-MARKETPLACE-ID": marketplace,
          Accept: "application/json",
        },
        signal,
      });

      if (res.status === 401) {
        this.tokenCache = null;
        throw new Error("eBay access token expired or invalid after retry");
      }
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(
        `eBay Browse API failed with status ${res.status}: ${errorText.slice(0, 200)}`
      );
    }

    const data: EBaySearchResponse = await res.json();
    const items = data.itemSummaries || [];
    const offers: ProviderOffer[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title || !item.price?.value) continue;

      const currency = item.price.currency || input.currency || "USD";
      const rawPrice = parseFloat(item.price.value);
      if (isNaN(rawPrice) || rawPrice <= 0) continue;

      const amountMinor = Math.round(
        rawPrice * (currency === "JPY" ? 1 : 100)
      );

      // Shipping option
      let shipping: { status: CostStatusType; amountMinor?: number; currency?: string } = {
        status: "UNKNOWN",
      };

      if (item.shippingOptions && item.shippingOptions.length > 0) {
        const primaryShipping = item.shippingOptions[0];
        if (
          primaryShipping.shippingCostType === "FREE" ||
          primaryShipping.shippingCost?.value === "0.00"
        ) {
          shipping = {
            status: "KNOWN",
            amountMinor: 0,
            currency: primaryShipping.shippingCost?.currency || currency,
          };
        } else if (primaryShipping.shippingCost?.value) {
          const shipVal = parseFloat(primaryShipping.shippingCost.value);
          if (!isNaN(shipVal)) {
            shipping = {
              status: "KNOWN",
              amountMinor: Math.round(
                shipVal * (currency === "JPY" ? 1 : 100)
              ),
              currency: primaryShipping.shippingCost.currency || currency,
            };
          }
        }
      }

      const merchantName = item.seller?.username || "eBay Seller";

      offers.push({
        providerId: this.id,
        providerOfferId: item.itemId,
        productTitle: item.title,
        merchantName,
        merchantId: merchantName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        price: {
          amountMinor,
          currency,
        },
        shipping,
        availability: "in_stock" as AvailabilityStatus,
        productUrl: item.itemWebUrl || "",
        imageUrl: item.image?.imageUrl,
        sellerRating: item.seller?.feedbackPercentage
          ? parseFloat(item.seller.feedbackPercentage)
          : undefined,
        ratingCount: item.seller?.feedbackScore,
        attributes: {},
        observedAt: new Date().toISOString(),
        rawSourceReference: "ebay:browse_api",
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
    if (!isConfigured) {
      return {
        healthy: false,
        isConfigured: false,
        kind: "UNCONFIGURED",
        message: "EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are not configured",
      };
    }

    try {
      await this.getAccessToken();
      return {
        healthy: true,
        isConfigured: true,
        kind: "LIVE",
        message: "eBay Browse API adapter configured and authenticated",
      };
    } catch (err: unknown) {
      return {
        healthy: false,
        isConfigured: true,
        kind: "LIVE",
        message: `eBay client credentials configured but authentication failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }
}


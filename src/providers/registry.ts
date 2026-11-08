import { ProductProvider } from "./types";
import { SeededDemoCatalogAdapter } from "./seeded/adapter";
import { CatalogProviderAAdapter } from "./provider-a/adapter";
import { CatalogProviderBAdapter } from "./provider-b/adapter";
import { SerpApiGoogleShoppingAdapter } from "./serpapi/adapter";
import { EBayBrowseAdapter } from "./ebay/adapter";
import { getEnv } from "@/src/config/env";

export class ProviderRegistry {
  private providers: Map<string, ProductProvider> = new Map();

  constructor(options?: { activeProviderSetting?: "all" | "seeded" | "provider_a" | "provider_b" | "serpapi" | "ebay" }) {
    let setting: "all" | "seeded" | "provider_a" | "provider_b" | "serpapi" | "ebay" = "all";
    let mode: "demo" | "live" = "demo";
    let providerAApiKey: string | undefined;
    let providerAEndpoint: string | undefined;
    let providerBApiKey: string | undefined;
    let providerBEndpoint: string | undefined;
    let serpApiKey: string | undefined;
    let serpApiBaseUrl: string | undefined;
    let ebayClientId: string | undefined;
    let ebayClientSecret: string | undefined;
    let ebayEnv: "sandbox" | "production" = "production";
    let ebayMarketplaceId: string | undefined;

    try {
      const env = getEnv();
      setting = options?.activeProviderSetting ?? env.PRODUCT_PROVIDER;
      mode = env.PROVIDER_MODE;
      providerAApiKey = env.PROVIDER_A_API_KEY;
      providerAEndpoint = env.PROVIDER_A_ENDPOINT;
      providerBApiKey = env.PROVIDER_B_API_KEY;
      providerBEndpoint = env.PROVIDER_B_ENDPOINT;
      serpApiKey = env.SERPAPI_API_KEY;
      serpApiBaseUrl = env.SERPAPI_BASE_URL;
      ebayClientId = env.EBAY_CLIENT_ID;
      ebayClientSecret = env.EBAY_CLIENT_SECRET;
      ebayEnv = env.EBAY_ENV;
      ebayMarketplaceId = env.EBAY_MARKETPLACE_ID;
    } catch {
      // In early bootstrap or testing
      setting = options?.activeProviderSetting ?? "all";
      mode = "demo";
    }

    if (setting === "all" || setting === "seeded") {
      this.register(new SeededDemoCatalogAdapter());
    }
    if (setting === "all" || setting === "provider_a") {
      this.register(
        new CatalogProviderAAdapter({
          apiKey: providerAApiKey,
          endpoint: providerAEndpoint,
          mode,
        })
      );
    }
    if (setting === "all" || setting === "provider_b") {
      this.register(
        new CatalogProviderBAdapter({
          apiKey: providerBApiKey,
          endpoint: providerBEndpoint,
          mode,
          shouldTimeout: false,
        })
      );
    }
    if (setting === "all" || setting === "serpapi") {
      this.register(
        new SerpApiGoogleShoppingAdapter({
          apiKey: serpApiKey,
          baseUrl: serpApiBaseUrl,
        })
      );
    }
    if (setting === "all" || setting === "ebay") {
      this.register(
        new EBayBrowseAdapter({
          clientId: ebayClientId,
          clientSecret: ebayClientSecret,
          env: ebayEnv,
          marketplaceId: ebayMarketplaceId,
        })
      );
    }
  }

  register(provider: ProductProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ProductProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): ProductProvider[] {
    return Array.from(this.providers.values());
  }

  clear(): void {
    this.providers.clear();
  }
}

export const defaultProviderRegistry = new ProviderRegistry();

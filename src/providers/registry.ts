import { ProductProvider } from "./types";
import { SeededDemoCatalogAdapter } from "./seeded/adapter";
import { CatalogProviderAAdapter } from "./provider-a/adapter";
import { CatalogProviderBAdapter } from "./provider-b/adapter";
import { getEnv } from "@/src/config/env";

export class ProviderRegistry {
  private providers: Map<string, ProductProvider> = new Map();

  constructor(options?: { activeProviderSetting?: "all" | "seeded" | "provider_a" | "provider_b" }) {
    let setting: "all" | "seeded" | "provider_a" | "provider_b" = "all";
    let mode: "demo" | "live" = "demo";
    let providerAApiKey: string | undefined;
    let providerAEndpoint: string | undefined;
    let providerBApiKey: string | undefined;
    let providerBEndpoint: string | undefined;

    try {
      const env = getEnv();
      setting = options?.activeProviderSetting ?? env.PRODUCT_PROVIDER;
      mode = env.PROVIDER_MODE;
      providerAApiKey = env.PROVIDER_A_API_KEY;
      providerAEndpoint = env.PROVIDER_A_ENDPOINT;
      providerBApiKey = env.PROVIDER_B_API_KEY;
      providerBEndpoint = env.PROVIDER_B_ENDPOINT;
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

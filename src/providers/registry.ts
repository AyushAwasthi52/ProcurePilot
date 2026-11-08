import { ProductProvider } from "./types";
import { SeededDemoCatalogAdapter } from "./seeded/adapter";
import { CatalogProviderAAdapter } from "./provider-a/adapter";
import { CatalogProviderBAdapter } from "./provider-b/adapter";
import { getEnv } from "@/src/config/env";

export class ProviderRegistry {
  private providers: Map<string, ProductProvider> = new Map();

  constructor(options?: { activeProviderSetting?: "all" | "seeded" | "provider_a" | "provider_b" }) {
    let setting: "all" | "seeded" | "provider_a" | "provider_b" = "all";
    try {
      setting = options?.activeProviderSetting ?? getEnv().PRODUCT_PROVIDER;
    } catch {
      // In early bootstrap or testing
      setting = options?.activeProviderSetting ?? "all";
    }

    if (setting === "all" || setting === "seeded") {
      this.register(new SeededDemoCatalogAdapter());
    }
    if (setting === "all" || setting === "provider_a") {
      this.register(new CatalogProviderAAdapter());
    }
    if (setting === "all" || setting === "provider_b") {
      this.register(new CatalogProviderBAdapter({ shouldTimeout: false }));
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

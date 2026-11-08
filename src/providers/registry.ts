import { ProductProvider } from "./types";
import { SeededDemoCatalogAdapter } from "./seeded/adapter";
import { CatalogProviderAAdapter } from "./provider-a/adapter";
import { CatalogProviderBAdapter } from "./provider-b/adapter";

export class ProviderRegistry {
  private providers: Map<string, ProductProvider> = new Map();

  constructor() {
    this.register(new SeededDemoCatalogAdapter());
    this.register(new CatalogProviderAAdapter());
    this.register(new CatalogProviderBAdapter({ shouldTimeout: false }));
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
}

export const defaultProviderRegistry = new ProviderRegistry();


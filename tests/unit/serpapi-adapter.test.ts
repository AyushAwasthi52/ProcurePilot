import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SerpApiGoogleShoppingAdapter } from "@/src/providers/serpapi/adapter";

describe("SerpApi Google Shopping Provider Adapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("reports UNCONFIGURED when SERPAPI_API_KEY is missing", async () => {
    const unconfigured = new SerpApiGoogleShoppingAdapter();
    expect(unconfigured.isConfigured()).toBe(false);

    const health = await unconfigured.healthCheck();
    expect(health.isConfigured).toBe(false);
    expect(health.kind).toBe("UNCONFIGURED");

    const searchRes = await unconfigured.search(
      { query: "mechanical keyboard" },
      new AbortController().signal
    );
    expect(searchRes.offers).toHaveLength(0);
  });

  it("normalizes a successful Google Shopping response with truthful fields and provenance", async () => {
    const adapter = new SerpApiGoogleShoppingAdapter({
      apiKey: "real_test_key_123",
      baseUrl: "https://serpapi.com/search.json",
    });

    expect(adapter.isConfigured()).toBe(true);

    const mockShoppingResponse = {
      search_metadata: { status: "Success" },
      shopping_results: [
        {
          position: 1,
          title: "Keychron K2 Wireless Mechanical Keyboard (Version 2)",
          link: "https://www.google.com/url?q=https://keychron.in/product/keychron-k2",
          product_id: "123456789",
          price: "₹7,499.00",
          extracted_price: 7499,
          source: "Keychron India",
          rating: 4.8,
          reviews: 412,
          thumbnail: "https://example.com/k2.jpg",
          delivery: "Free delivery",
          extensions: ["In stock", "Free delivery"],
        },
        {
          position: 2,
          title: "Logitech MX Mechanical Mini Keyboard",
          link: "https://www.amazon.in/dp/B09LKJHG",
          product_id: "987654321",
          price: "₹12,995.00",
          extracted_price: 12995,
          source: "Amazon.in",
          rating: 4.5,
          reviews: 1250,
          thumbnail: "https://example.com/mx.jpg",
          delivery: "₹150 delivery",
          extensions: [],
        },
        {
          position: 3,
          title: "Royal Kludge RK61 Wireless Keyboard",
          link: "https://example.com/rk61",
          product_id: "456789123",
          price: "₹3,999.00",
          extracted_price: 3999,
          source: "Meckeys",
          // delivery missing: must remain UNKNOWN, never silently 0!
        },
      ],
    };

    let requestedUrl = "";
    global.fetch = vi.fn().mockImplementation((url: string) => {
      requestedUrl = url;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockShoppingResponse,
      } as unknown as Response);
    });

    const res = await adapter.search(
      {
        query: "mechanical keyboard",
        region: "IN",
        currency: "INR",
      },
      new AbortController().signal
    );

    // Verify geographic targeting in requested URL
    expect(requestedUrl).toContain("engine=google_shopping");
    expect(requestedUrl).toContain("gl=in");
    expect(requestedUrl).toContain("location=India");
    expect(requestedUrl).toContain("q=mechanical+keyboard");

    // Verify offers
    expect(res.offers).toHaveLength(3);

    // Offer 1: Free shipping
    const off1 = res.offers[0];
    expect(off1.productTitle).toBe("Keychron K2 Wireless Mechanical Keyboard (Version 2)");
    expect(off1.merchantName).toBe("Keychron India");
    expect(off1.price.amountMinor).toBe(749900); // 7499 * 100 paise
    expect(off1.price.currency).toBe("INR");
    expect(off1.shipping?.status).toBe("KNOWN");
    expect(off1.shipping?.amountMinor).toBe(0); // Free delivery
    expect(off1.availability).toBe("in_stock");
    expect(off1.sellerRating).toBe(4.8);
    expect(off1.ratingCount).toBe(412);
    expect(off1.isDemo).toBe(false);
    expect(off1.rawSourceReference).toBe("serpapi:google_shopping");

    // Offer 2: Paid shipping
    const off2 = res.offers[1];
    expect(off2.shipping?.status).toBe("KNOWN");
    expect(off2.shipping?.amountMinor).toBe(15000); // ₹150 * 100 paise

    // Offer 3: Missing shipping -> Must be UNKNOWN, NOT 0!
    const off3 = res.offers[2];
    expect(off3.shipping?.status).toBe("UNKNOWN");
    expect(off3.shipping?.amountMinor).toBeUndefined();
    expect(off3.availability).toBe("unknown"); // Not fabricated
  });

  it("handles SerpApi invalid key (401) with descriptive error", async () => {
    const adapter = new SerpApiGoogleShoppingAdapter({
      apiKey: "invalid_key",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as unknown as Response);

    await expect(
      adapter.search({ query: "keyboard" }, new AbortController().signal)
    ).rejects.toThrow("Invalid SerpApi API key");
  });

  it("handles SerpApi rate limit (429) with descriptive error", async () => {
    const adapter = new SerpApiGoogleShoppingAdapter({
      apiKey: "rate_limited_key",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    } as unknown as Response);

    await expect(
      adapter.search({ query: "keyboard" }, new AbortController().signal)
    ).rejects.toThrow("SerpApi rate limit exceeded");
  });

  it("handles empty results without error", async () => {
    const adapter = new SerpApiGoogleShoppingAdapter({
      apiKey: "valid_key",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        shopping_results: [],
      }),
    } as unknown as Response);

    const res = await adapter.search(
      { query: "nonexistent item xyz12345" },
      new AbortController().signal
    );

    expect(res.offers).toHaveLength(0);
  });
});


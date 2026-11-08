import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EBayBrowseAdapter } from "@/src/providers/ebay/adapter";

describe("eBay Browse API Provider Adapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("reports UNCONFIGURED when EBAY_CLIENT_ID or EBAY_CLIENT_SECRET is missing", async () => {
    const unconfigured = new EBayBrowseAdapter();
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

  it("requests, caches and reuses OAuth access token", async () => {
    const adapter = new EBayBrowseAdapter({
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      oauthBaseUrl: "https://api.test.ebay.com",
    });

    expect(adapter.isConfigured()).toBe(true);

    let tokenCallCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/identity/v1/oauth2/token")) {
        tokenCallCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "v1_test_oauth_access_token_xyz",
            expires_in: 7200,
            token_type: "Application Access Token",
          }),
        } as unknown as Response);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const token1 = await adapter.getAccessToken();
    expect(token1).toBe("v1_test_oauth_access_token_xyz");
    expect(tokenCallCount).toBe(1);

    // Second call should return cached token without requesting again
    const token2 = await adapter.getAccessToken();
    expect(token2).toBe("v1_test_oauth_access_token_xyz");
    expect(tokenCallCount).toBe(1);
  });

  it("normalizes eBay Browse API search items with truthful seller ratings and shipping", async () => {
    const adapter = new EBayBrowseAdapter({
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      oauthBaseUrl: "https://api.test.ebay.com",
      apiBaseUrl: "https://api.test.ebay.com",
    });

    const mockItemSummaries = {
      total: 2,
      itemSummaries: [
        {
          itemId: "v1|123456789012|0",
          title: "Keychron K2 Mechanical Keyboard Wireless RGB Backlit",
          price: {
            value: "79.99",
            currency: "USD",
          },
          seller: {
            username: "tech_direct_store",
            feedbackPercentage: "99.4",
            feedbackScore: 8450,
          },
          itemWebUrl: "https://www.ebay.com/itm/123456789012",
          image: {
            imageUrl: "https://i.ebayimg.com/images/k2.jpg",
          },
          shippingOptions: [
            {
              shippingCostType: "FREE",
              shippingCost: {
                value: "0.00",
                currency: "USD",
              },
            },
          ],
        },
        {
          itemId: "v1|987654321098|0",
          title: "Logitech MX Keys Wireless Keyboard",
          price: {
            value: "99.00",
            currency: "USD",
          },
          seller: {
            username: "gadget_emporium",
            feedbackPercentage: "98.1",
            feedbackScore: 3200,
          },
          itemWebUrl: "https://www.ebay.com/itm/987654321098",
          image: {
            imageUrl: "https://i.ebayimg.com/images/mx.jpg",
          },
          shippingOptions: [
            {
              shippingCostType: "FIXED",
              shippingCost: {
                value: "9.50",
                currency: "USD",
              },
            },
          ],
        },
      ],
    };

    let requestedSearchHeader = "";
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/identity/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "v1_test_oauth_access_token",
            expires_in: 7200,
          }),
        } as unknown as Response);
      }
      if (url.includes("/buy/browse/v1/item_summary/search")) {
        const headers = init?.headers as Record<string, string>;
        requestedSearchHeader = headers["X-EBAY-C-MARKETPLACE-ID"];
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockItemSummaries,
        } as unknown as Response);
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    const res = await adapter.search(
      {
        query: "wireless keyboard",
        region: "US",
        currency: "USD",
      },
      new AbortController().signal
    );

    expect(requestedSearchHeader).toBe("EBAY_US");
    expect(res.offers).toHaveLength(2);

    const off1 = res.offers[0];
    expect(off1.productTitle).toBe("Keychron K2 Mechanical Keyboard Wireless RGB Backlit");
    expect(off1.price.amountMinor).toBe(7999);
    expect(off1.price.currency).toBe("USD");
    expect(off1.merchantName).toBe("tech_direct_store");
    expect(off1.sellerRating).toBe(99.4);
    expect(off1.ratingCount).toBe(8450);
    expect(off1.shipping?.status).toBe("KNOWN");
    expect(off1.shipping?.amountMinor).toBe(0);
    expect(off1.isDemo).toBe(false);
    expect(off1.rawSourceReference).toBe("ebay:browse_api");

    const off2 = res.offers[1];
    expect(off2.shipping?.status).toBe("KNOWN");
    expect(off2.shipping?.amountMinor).toBe(950);
  });

  it("handles invalid OAuth credentials (401) gracefully", async () => {
    const adapter = new EBayBrowseAdapter({
      clientId: "bad_client_id",
      clientSecret: "bad_client_secret",
      oauthBaseUrl: "https://api.test.ebay.com",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as unknown as Response);

    await expect(adapter.getAccessToken()).rejects.toThrow(
      "Invalid eBay client credentials"
    );
  });

  it("invalidates cached token and retries search on 401 Unauthorized", async () => {
    const adapter = new EBayBrowseAdapter({
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      oauthBaseUrl: "https://api.test.ebay.com",
      apiBaseUrl: "https://api.test.ebay.com",
    });

    let tokenAttempts = 0;
    let searchAttempts = 0;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/identity/v1/oauth2/token")) {
        tokenAttempts++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: `token_${tokenAttempts}`,
            expires_in: 7200,
          }),
        } as unknown as Response);
      }

      if (url.includes("/buy/browse/v1/item_summary/search")) {
        searchAttempts++;
        if (searchAttempts === 1) {
          // First attempt fails with 401 expired token
          return Promise.resolve({
            ok: false,
            status: 401,
            text: async () => "Unauthorized: token expired",
          } as unknown as Response);
        }
        // Second attempt with retried token succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            total: 1,
            itemSummaries: [
              {
                itemId: "v1|item999|0",
                title: "Retried Keychron Keyboard",
                price: { value: "85.00", currency: "USD" },
              },
            ],
          }),
        } as unknown as Response);
      }

      return Promise.reject(new Error("Unknown endpoint"));
    });

    const res = await adapter.search(
      { query: "keyboard", region: "US", currency: "USD" },
      new AbortController().signal
    );

    expect(tokenAttempts).toBe(2);
    expect(searchAttempts).toBe(2);
    expect(res.offers).toHaveLength(1);
    expect(res.offers[0].productTitle).toBe("Retried Keychron Keyboard");
  });
});


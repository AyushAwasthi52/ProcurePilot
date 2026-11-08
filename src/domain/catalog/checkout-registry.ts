export type CheckoutCapability = "DEMO_PAYPAL" | "MERCHANT_API" | "HANDOFF_ONLY";

export interface MerchantCapabilityInfo {
  merchantId: string;
  merchantName: string;
  capability: CheckoutCapability;
  supportedCurrencies: string[];
  description: string;
}

const REGISTERED_MERCHANTS: Record<string, MerchantCapabilityInfo> = {
  mer_demo_store: {
    merchantId: "mer_demo_store",
    merchantName: "ProcurePilot Demo Store (sandbox)",
    capability: "DEMO_PAYPAL",
    supportedCurrencies: ["USD", "EUR", "GBP"],
    description: "Platform demo store supporting end-to-end PayPal Orders v2 sandbox checkout.",
  },
  mer_brightline: {
    merchantId: "mer_brightline",
    merchantName: "Brightline Electronics",
    capability: "HANDOFF_ONLY",
    supportedCurrencies: ["USD"],
    description: "External merchant without open checkout API. Guided direct seller handoff.",
  },
  mer_northgate: {
    merchantId: "mer_northgate",
    merchantName: "Northgate Direct",
    capability: "HANDOFF_ONLY",
    supportedCurrencies: ["USD"],
    description: "External merchant without open checkout API. Guided direct seller handoff.",
  },
  mer_valuehub: {
    merchantId: "mer_valuehub",
    merchantName: "ValueHub",
    capability: "HANDOFF_ONLY",
    supportedCurrencies: ["USD"],
    description: "External merchant without open checkout API. Guided direct seller handoff.",
  },
};

export const CheckoutCapabilityRegistry = {
  getCapability(merchantId?: string, merchantName?: string): CheckoutCapability {
    if (merchantId && REGISTERED_MERCHANTS[merchantId]) {
      return REGISTERED_MERCHANTS[merchantId].capability;
    }

    if (merchantName?.toLowerCase().includes("demo store")) {
      return "DEMO_PAYPAL";
    }

    // Default for all other merchants: HANDOFF_ONLY (never assume checkout capability)
    return "HANDOFF_ONLY";
  },

  getMerchantInfo(merchantId: string): MerchantCapabilityInfo | null {
    return REGISTERED_MERCHANTS[merchantId] ?? null;
  },

  isPayPalDemoEligible(merchantId?: string): boolean {
    return this.getCapability(merchantId) === "DEMO_PAYPAL";
  },
};


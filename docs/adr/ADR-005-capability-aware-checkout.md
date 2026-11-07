# ADR-005: Capability-Aware Checkout Registry

## Status
Accepted

## Context
A major shortcoming in early AI commerce concepts is assuming an agent can unilaterally complete checkout on arbitrary third-party marketplaces. Most real-world retailers do not expose open checkout APIs or allow programmatic cart completion without partner agreements or direct user handoffs. Promising universal automated checkout leads to brittle web automation, anti-bot blocking, and compromised security.

## Decision
ProcurePilot adopts a **Capability-Aware Checkout** architecture. Every merchant listing explicitly declares its supported checkout capabilities via a centralized `MerchantCheckoutRegistry`:

```typescript
enum CheckoutCapability {
  DEMO_PAYPAL = 'DEMO_PAYPAL',   // Platform first-party demo store with PayPal sandbox
  MERCHANT_API = 'MERCHANT_API', // Direct merchant checkout API (supported partner)
  HANDOFF_ONLY = 'HANDOFF_ONLY', // Guided transfer to merchant's direct storefront
}
```

### Invariants:
1. **DEMO_PAYPAL**: Available only for the platform's verified first-party demo merchant, completing PayPal Orders v2 in sandbox.
2. **MERCHANT_API**: Supported only where an authenticated, compliant API adapter exists for that merchant.
3. **HANDOFF_ONLY**: Default for all other merchants. The UI provides a verified deep-link to the seller's product page and explicitly states: *"Brightline has no supported checkout API, so you finish on their site. We cannot pay or edit their cart for you."*
4. **UI Honesty**: The user interface only renders actions supported by the seller's checkout capability. No fake payment buttons are rendered for handoff-only merchants.

## Consequences
- Preserves trust: the platform never promises an automated purchase it cannot legitimately fulfill.
- Zero reliance on brittle, non-compliant web scraping or CAPTCHA bypasses.
- Provides a clean extension path for future commerce protocols (such as Agentic Commerce Protocol / ACP) as partner APIs become available.


# ADR-004: Purchase Plan Expiry, SHA-256 Plan Hash, and Approval Binding

## Status
Accepted

## Context
In commerce and procurement systems, prices fluctuate, item availability changes, and network attacks (such as race conditions or parameter tampering) may attempt to alter transaction values between user review and payment execution. If a user approves a transaction for $1,649.00 USD, any subsequent mutation in price, currency, merchant, tax, or items must immediately invalidate the approval. Furthermore, un-executed proposals must not remain indefinitely valid.

## Decision
1. **Plan Expiry (TTL)**:
   - Every `PurchasePlan` is given an explicit expiration timestamp (`expiresAt`), default 10 minutes (600 seconds) from creation.
   - An expired plan cannot be approved and cannot initiate a payment order.
   - Expiration can be resolved by invoking a refresh endpoint, which re-verifies price and stock, archives the old plan as `SUPERSEDED`, and creates a new plan version.

2. **Canonical Plan Hash**:
   - Every `PurchasePlan` generates a deterministic SHA-256 hash computed over canonical JSON (lexicographically sorted keys, no whitespace) of its immutable fields:
     - `planId`, `version`, `offerId`, `merchantId`, `itemSnapshot`, `quantity`, `itemMinor`, `shippingStatus`, `shippingMinor`, `taxStatus`, `taxMinor`, `totalKnownMinor`, `currency`, `expiresAt`.

3. **Approval Cryptographic Binding**:
   - The `Approval` record stores the user's explicit confirmation, `planHash`, `approvedAmountMinor`, and `approvedCurrency`.
   - When initiating a checkout or payment order, the server verifies:
     - The plan is `ACTIVE` and `expiresAt > now()`.
     - The stored `plan.planHash` matches the approved `approval.planHash`.
     - The payment amount matches `approvedAmountMinor` and `approvedCurrency`.
   - Any divergence revokes the approval and returns HTTP 409 (`PLAN_HASH_MISMATCH` or `OFFER_CHANGED`).

## Consequences
- Impossible for client-side manipulation to charge a different amount or redirect payment to another merchant.
- Guarantees explicit human agency at the money boundary.
- Full auditable trace linking the exact approved terms to the payment record.


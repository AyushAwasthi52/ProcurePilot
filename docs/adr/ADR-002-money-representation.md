# ADR-002: Integer Minor Units and ISO 4217 Exponents for Currency

## Status
Accepted

## Context
E-commerce applications frequently suffer from floating-point arithmetic inaccuracies when calculating taxes, discounts, shipping, and totals. Furthermore, different currencies have different sub-unit exponents (e.g., USD has 2 decimals, JPY has 0 decimals, KWD has 3 decimals). Sending raw floating-point numbers or arbitrary strings to payment gateways introduces calculation mismatches and vulnerability to tampering.

## Decision
All monetary values in ProcurePilot are represented strictly as **integer minor units** accompanied by an ISO 4217 3-letter currency code:
```typescript
interface Money {
  amountMinor: number; // e.g., 164900 for $1,649.00 USD
  currency: string;    // ISO 4217, e.g. "USD", "EUR", "JPY"
}
```

### Invariants:
1. Floating-point numbers are prohibited in database storage, API contracts, domain calculations, and payment adapter payloads.
2. A single authoritative `Money` domain utility (`src/domain/money/money.ts`) performs all rounding, addition, multiplication, formatting, and conversion to PayPal decimal strings.
3. Cross-currency comparisons or additions are rejected without an explicit timestamped foreign exchange (FX) record.
4. When formatting for the PayPal Orders v2 API, the `Money` utility formats the decimal string according to the ISO 4217 exponent table (e.g. `1649.00` for USD, `1500` for JPY).

## Consequences
- Guaranteed mathematical precision without rounding anomalies.
- Direct alignment with PayPal Orders v2 monetary schemas.
- Complete prevention of floating-point comparison bugs in budget compliance checks.


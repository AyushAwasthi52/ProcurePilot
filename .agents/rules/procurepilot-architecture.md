---
trigger: always_on
---

# ProcurePilot Architecture Constraints

## Architecture
- Use the existing modular monolith.
- Reuse existing domain models, services and abstractions.
- Avoid unnecessary dependencies and duplicate abstractions.
- Keep domain logic independent of Next.js, UI and provider SDKs.
- Validate all external input with Zod.
- Use strict TypeScript.

## Data Integrity
- Never invent product data or provider responses.
- Distinguish demo, mock, fixture and live data.
- Preserve source provenance and observation timestamps.
- Unknown shipping or tax must remain unknown, never silently zero.
- Never present stale data as live verified data.

## Financial Safety
- Store money as integer minor units.
- Keep scoring and financial calculations deterministic.
- Never let an LLM decide payment amounts or payment states.
- Require an immutable purchase plan and explicit approval.
- Verify amount, currency, merchant and plan hash.
- Preserve PayPal signature verification and reconciliation.

## Security
- Preserve authentication and authorization.
- Verify purchase-request ownership.
- Preserve CSRF protections and rate limits.
- Never expose secrets to the client.
- Never log credentials, tokens or sensitive payment information.

## Provider Integrations
- Never claim an adapter is live merely because it implements an interface.
- Identify whether an integration uses fixtures, mocks or a real API.
- Respect provider terms, rate limits and permitted access.
- Never bypass authentication, CAPTCHA or anti-bot protections.
- Never silently substitute demo offers after live provider failure.

## Quality
- Test error states and edge cases.
- Do not remove tests to make CI pass.
- Update implementation documentation only after verification.

# ProcurePilot — Durable Project Context

## Product
ProcurePilot is an AI-assisted purchasing intelligence platform. A user describes a purchase; the system extracts a structured brief, discovers offers from permitted sources, normalizes and evaluates them deterministically, explains trade-offs, and prepares a purchase plan for explicit human approval.

It is not merely a shopping chatbot. The goal is better purchasing decisions and safe execution of an approved purchase.

## Current development priority
Stabilize the end-to-end consumer workflow before expanding coupons, bargaining, business procurement, or checkout automation.

First acceptance journey:
1. Enter an unfamiliar product request, e.g. wireless mechanical keyboard under ₹8,000.
2. Extract category/query, budget, currency, region, quantity, must-haves and preferences.
3. Ask clarification questions for material ambiguity.
4. Search configured discovery providers.
5. Normalize and deduplicate offers.
6. Compare real provider results with honest provenance.
7. Explain fit, unknowns and ranking.

## Architecture
- Next.js App Router, TypeScript strict, PostgreSQL/Prisma, Zod, Vitest, Playwright where configured.
- Modular monolith.
- src/domain/** remains independent of UI, AI and provider SDKs.
- Provider adapters are behind the existing provider interface.
- LLMs handle natural language, extraction and explanations.
- Deterministic code owns money, constraints, ranking, approvals and payment state.
- Money uses integer minor units and explicit currency semantics.
- Keep provider provenance and observation timestamps.

## Non-negotiable invariants
- Never fabricate products, prices, sellers, ratings, stock, delivery, warranty, returns, discounts or provider responses.
- Clearly distinguish live, demo, fixture, inferred, estimated, stale, unknown and unverified data.
- Missing budget is unknown; never silently convert it to zero or invent a default budget.
- Unknown shipping/tax is not zero.
- An offer with unverified critical constraints must not be presented as fully compliant.
- Never expose API keys or payment credentials to the browser or logs.
- Preserve authentication, ownership, CSRF, audit logging and rate limits.
- Never make a real payment or merchant purchase without explicit user approval of the exact plan and amount.
- Respect provider terms, quotas and anti-bot protections.

## Current known problems (observed 2026-11-08)
- Home-page request creation displayed an internal server error for the prompt keyboard.
- Comparison page crashed at app/compare/page.tsx:214 with Cannot read properties of undefined (reading 'amountMinor'), on brief.budget.amountMinor.
- The exact backend root cause has not yet been proven. Antigravity must reproduce and trace it before fixing.
- Prior repository inspection found limited explicit category definitions and mock extraction with hand-written keyword rules.
- Prior provider adapters included hardcoded fixture catalogues. Provider health/provenance must not imply live data unless an actual configured API is queried.
- SerpApi Google Shopping and eBay Browse integrations were proposed, but must not be considered implemented until code, credentials, response normalization and tests prove it.

## Current task
See NEXT_TASK.md. Do not expand scope until its acceptance criteria are met.

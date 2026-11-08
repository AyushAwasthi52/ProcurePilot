# ProcurePilot — Implementation Status & Architecture Notes

## Current Implementation State (Phases 0 – 10)

- **Phase 0 — Project Foundations:** Core Next.js 16 + React 19 app router scaffold, Tailwind CSS design system tokens, pure domain types, strict schemas.
- **Phase 1 — Discovery Engine & Normalization:** ProductProvider adapter interfaces, canonical normalizers, bounded multi-provider orchestration, resilient fallback handling.
- **Phase 2 — LLM Intent Extraction:** Structured brief extraction with Zod schema validation, fallback handling, strict isolation between LLM output and financial / trust metrics.
- **Phase 3 — Trust Scoring & Anomaly Detection:** Anomaly detection, composite trust rating heuristics, risk rules, explainable decision guardrails.
- **Phase 4 — Optimal Plan Assembly:** Canonical offer pairing, budget compliance checks, cryptographic plan hashing (`SHA-256`), tamper-evident plan guarantees.
- **Phase 5 — Human Approval & Governance:** Approval audit logging, role-based authorization guardrails, plan state transitions.
- **Phase 6 — Server-Side PayPal Checkout & Order Management:** Server-side PayPal Orders v2 integration, currency and minor unit handling, anti-drift amount verification.
- **Phase 7 — Webhook Reconciliation & Signature Verification:** PayPal webhook processing, digital signature verification (`/v1/notifications/verify-webhook-signature`), immutable audit trails.
- **Phase 8 — Security Hardening, Rate Limiting & Lifecycle Verification:** Security headers middleware, IP-based sliding-window rate limiters, 10-stage end-to-end lifecycle verification test.
- **Phase 9 — Configuration & Integration Audit:** Centralized Zod environment validation (`src/config/env.ts`), provider-neutral LLM client factory (`GeminiLlmClient` & `MockLlmClient`), decoupled partner catalog adapters, explicit simulated payment controls (`PAYMENTS_SIMULATED`).
- **Category-Agnostic Transformation:** Transformed application from laptop-specific demo into generic multi-category purchasing intelligence system supporting Laptops, Headphones, Smartphones, Monitors, Furniture, and arbitrary products. Dynamic brief extraction, category-specific clarifications, multi-category discovery, dynamic comparison without static mock candidates, and plan assembly.
- **Core Purchasing Workflow Stabilization (Phases 1 – 6):**
  - **Request Lifecycle:** AbortController cancellation on input edits, sequence-based race condition prevention, input association tracking, clean error states, and safe component unmounting. Support for quantity and urgency overrides.
  - **Truthful Providers:** Eliminated misleading `isDemo: false` flags on all in-memory fixtures. Explicitly distinguished `LIVE`, `DEMO`, `UNCONFIGURED`, `FAILED`, and `TIMED_OUT` outcomes. Isolated provider endpoints and credentials behind validated env schema.
  - **Category & Attribute Handling:** Preserved rich extracted attributes for unfamiliar / generic procurement (lumbar support, armrests, dual motor, connectivity, ergonomics) instead of empty briefs. Added category clarification questions for ambiguous procurement requests.
  - **Search Orchestration & Persistence:** Search results persisted and retrievable via `GET /api/purchase-requests/[id]/search`. Comparison page displays real search outcomes, and price intelligence card computes real candidate spread rather than hardcoded laptop prices.
  - **Security & CSRF Enforcement:** Completely eliminated browser-side `x-test-skip-csrf` bypasses. Added `GET /api/csrf` endpoint and double-submit verification. Restricted test header bypasses strictly to `NODE_ENV === "test"`.
  - **Regression Testing:** 29 test suites, 129/129 tests passing.

- **Universal Product Discovery Engine & Real Provider Integrations:**
  - **Internal Server Error Root Cause & AI Resilience:** Diagnosed `keyboard` request crash: `.env` configured `AI_PROVIDER=gemini` with an unverified or invalid API key or a 404 model version, causing `GeminiLlmClient` to throw an unhandled exception that returned HTTP 500 to the browser. Implemented AI provider resilience in `src/ai/orchestrator/extraction.ts`: if the primary LLM provider fails, times out (10s AbortSignal), or encounters API key/quota errors, the orchestrator logs a warning and gracefully falls back to the deterministic offline extraction engine (`MockLlmClient`).
  - **Universal Category Extraction & Clean Search Queries:** Added category definitions and alias matchers for `Keyboard`, `Furniture`, `Footwear`, `Home Appliances` alongside existing categories, plus pure generic support for any unfamiliar item. Search queries are stripped of budget/boilerplate noise (`under ₹8,000`, `urgent`, `looking for`) to produce high-relevance search queries (`wireless mechanical keyboard`, `ergonomic office chair`).
  - **International Currency & Minor Unit Representation:** Full support for INR (`₹`, paise minor units), USD (`$`), EUR (`€`), GBP (`£`), CAD, AUD, JPY across prompts and extraction.
  - **Missing Budget Handling:** Never defaults to $0.00 or an empty brief. For requests with no budget (e.g. `keyboard`, `ergonomic office chair`, `running shoes`), sets a provisional baseline, flags an unconfirmed budget constraint in `mustHave`, and triggers an interactive clarification question with formatted price tiers (`Economy`, `Mid-range`, `Premium`, `Flexible`).
  - **SerpApi Google Shopping Provider Adapter (`src/providers/serpapi/adapter.ts`):** Genuine live Google Shopping integration with geographic targeting (`gl=in`, `hl=en`, `location=India`), parsing titles, prices into minor units, merchant details, honest shipping status (`KNOWN` with 0 minor for free delivery, parsed fee, or `UNKNOWN` without fabricating), ratings, review counts, and live provenance (`isDemo: false`).
  - **eBay Browse API Provider Adapter (`src/providers/ebay/adapter.ts`):** Official OAuth 2.0 client credentials flow with in-memory token caching and expiration TTL, marketplace targeting (`EBAY_IN`, `EBAY_US`, `EBAY_GB`), keyword search, and normalized offers.
  - **Truthful Status Reporting:** Distinguishes `LIVE`, `DEMO`, and `UNCONFIGURED` provider states in `SearchOrchestrator` and `/compare` status strips.
  - **Verification:** 34 test suites, 150/150 tests passing. Clean TypeScript, ESLint, and Next.js production build.

---

## Category-Agnostic Architecture Details

### 1. Dynamic Category Registry (`src/ai/categories/`)
- Declarative category definitions with aliases, typed attribute schemas, units, default preference weight distributions, and targeted clarification questions.
- Built-in support for `Laptop` (CUDA clarification), `Headphones` (ANC clarification), `Smartphone` (OS ecosystem clarification), `Monitor` (Refresh rate clarification), and `General` procurement.

### 2. Provider Discovery & Multi-Category Catalog
- Expanded seeded catalog (`prisma/seed.ts`) with verified deterministic demo items across headphones, smartphones, and monitors alongside laptops, clearly labeled with `isDemo: true`.
- Decoupled `SeededDemoCatalogAdapter`, `ProviderAAdapter`, and `ProviderBAdapter` to match based on user query tokens and detected category.
- Graceful empty results handling returning 0 offers when querying non-existent inventory.

### 3. Dynamic Comparison & Plan Creation
- Fully eliminated static `CANDIDATES` array from `app/compare/page.tsx`.
- Real-time evaluation via pure domain `evaluateAndRankOffers` against discovered offers.
- Generalized `CandidateTable` to render category-appropriate key specifications.
- Dynamic `ExcludedPanels` rendering actual over-budget and flagged offers.
- Connected `searchOrchestrator` directly with `app/api/purchase-plans` to lock real discovered item snapshots into immutable SHA-256 purchase plans.

---

## CI / CD Runtime Compatibility Fix

### Incident Analysis
- **Failing Action Run:** `42446757895`
- **Symptom:** `TypeError: Cannot read properties of undefined (reading 'bind')` originating from `node_modules/undici/lib/interceptor/decompress.js:78:30`.
- **Impact:** Vitest fork workers failed during startup across all 23 test suites, reporting 23 unhandled errors and 0 executed tests.

### Root Cause
1. `jsdom@31.0.0` pulled in `undici@8.12.4`, which requires `"engines": { "node": ">=22.19.0" }`.
2. Undici 8.12.4 references `createZstdDecompress` directly from the standard library `node:zlib`:
   ```javascript
   zstd: createZstdDecompress.bind(null, { params: { [constants.ZSTD_d_windowLogMax]: 23 } })
   ```
3. Native Zstandard decompression was introduced into Node core in the Node 22 series (`>=22.15.0` / `>=22.19.0`).
4. GitHub Actions workflow `.github/workflows/ci.yml` had `node-version: 20` configured, where `zlib.createZstdDecompress` is `undefined`. When Vitest worker forks loaded `jsdom` and imported `undici`, the module-level bind threw a `TypeError`.

### Resolution
1. **GitHub Actions Workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):**
   - Updated `node-version` from `20` to `22` (Active LTS).
2. **Package Engines Declaration ([`package.json`](package.json)):**
   - Added `"engines": { "node": ">=22.19.0" }` to explicitly declare Node LTS runtime compatibility requirements across all environments.
3. **Integrity Verification:**
   - 24 test suites, 109/109 tests passing locally.
   - Clean TypeScript check (`npm run typecheck`).
   - Clean ESLint check (`npm run lint`).
   - Clean Next.js production build (`npm run build`).

---

## Comparison Page Resilience & Data Contract Hardening

### Incident Analysis
- **Symptom:** `TypeError: Cannot read properties of undefined (reading 'amountMinor')` on `/compare` at `app/compare/page.tsx:214` inside `CompareContent` (`brief.budget.amountMinor`).
- **Impact:** Any user searching for a product and navigating to the comparison screen suffered a hard crash when the page retrieved the persisted purchase request.

### Root Cause
1. **Schema & Model Asymmetry:** In PostgreSQL / Prisma (`prisma/schema.prisma`), `model PurchaseBrief` stores flat scalar columns (`budgetMinor Int`, `budgetCurrency String`, `includesShipping Boolean`). The TypeScript domain contract (`PurchaseBrief`) expects a nested `budget: Budget` object (`{ amountMinor, currency, includesShipping, isKnown }`).
2. **Query Layer Blind Cast:** `src/db/queries/purchase-requests.ts` used `(found.brief as unknown as PurchaseBrief)` across database queries. In-memory creations returned the full in-memory object on initial `POST /api/purchase-requests`, but when `/compare` subsequently fetched `GET /api/purchase-requests/${id}`, the database returned the raw Prisma row where `brief.budget` was literally `undefined`.
3. **UI and Domain Null-Safety Gaps:** Hardcoded `brief.budget.amountMinor` accesses in `app/compare/page.tsx`, `formatPriceMinor` displaying misleading `"$0.00"` for unspecified budgets on `app/page.tsx`, and unsafe `offer.attributes` indexing in constraint and trust rules without null guards.

### Resolution
1. **Database Rehydration Mapper ([`src/db/queries/purchase-requests.ts`](src/db/queries/purchase-requests.ts)):**
   - Implemented `mapDatabaseRowToPurchaseBrief` which reconstructs nested `budget: Budget` (`{ amountMinor: rawMinor > 0 ? rawMinor : null, currency, includesShipping, isKnown: rawMinor > 0 }`) and parses JSON columns (`useCases`, `mustHave`, `preferences`, `assumptions`). Applied to `getPurchaseRequestById`, `createPurchaseRequest`, and `updatePurchaseBrief`.
2. **Explicit Unknown Budget Semantics ([`src/domain/purchase/types.ts`](src/domain/purchase/types.ts), [`src/ai/schemas/brief.ts`](src/ai/schemas/brief.ts)):**
   - Updated `Budget` and `BudgetSchema` to support `amountMinor: number | null` and `isKnown: boolean`.
   - Updated `evaluateOfferConstraints` and `evaluateAndRankOffers` to handle `amountMinor === null` safely without crashing or rejecting valid candidates.
3. **Comparison Page & Home Page UI Resilience ([`app/compare/page.tsx`](app/compare/page.tsx), [`app/page.tsx`](app/page.tsx)):**
   - Added defensive response normalization in `executeDiscovery` to ensure any payload contains a valid `budget` object.
   - Guarded budget displays with currency-aware formatters and fallback chips (`"Budget cap: Not specified"` with direct link to set target budget).
   - Replaced hardcoded `"$0.00"` displays with `"Not specified (open budget)"`.
4. **Offer Attribute Null-Safety ([`src/domain/scoring/constraints.ts`](src/domain/scoring/constraints.ts), [`src/domain/scoring/model.ts`](src/domain/scoring/model.ts), [`src/domain/trust/rules.ts`](src/domain/trust/rules.ts)):**
   - Guarded all `offer.attributes` accesses against `undefined` / `null` attributes in constraints, trust scoring, and rule evaluation.
5. **Comprehensive Regression Suite ([`tests/unit/comparison-resilience.test.ts`](tests/unit/comparison-resilience.test.ts)):**
   - Validated all 8 required scenarios:
     1. Valid keyboard purchase request with hydrated budget.
     2. Keyboard request with unknown budget (`amountMinor: null`).
     3. Request with complete budget enforcing boundaries.
     4. Legacy flat database row reconstruction.
     5. Malformed API response hydration.
     6. Request whose brief is null.
     7. Request created, searched, and evaluated end-to-end.
     8. Comparison rendering with incomplete optional attributes.
6. **Verification:**
   - 35 test suites, 158/158 tests passing (`npm test`).
   - TypeScript compilation passing (`npm run typecheck`).
   - ESLint check passing with 0 warnings/errors (`npm run lint`).
   - Next.js production build passing (`npm run build`).

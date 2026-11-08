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

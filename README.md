# ProcurePilot — Autonomous Purchasing Intelligence Platform (v1.1)

> **Autonomous Purchasing Intelligence Platform**  
> AI-assisted procurement intelligence, deterministic decision-scoring, and capability-aware payment orchestration.

ProcurePilot translates human procurement requests into checkable structured briefs, executes multi-source offer discovery, normalizes specifications, evaluates fit and landed value deterministically, and presents evidence-backed recommendations. Once approved by a human at the money boundary, the platform orchestrates checkout strictly through actions the seller supports (PayPal Sandbox demo store, direct partner API, or seller storefront handoff).

---

## Authoritative Architecture Principles

1. **Evidence Before Confidence**: Every recommendation cites its source, timestamp, and field provenance (`You said`, `Inferred`, `Provider-reported`, `Verified`, `Computed`).
2. **Total Value Over Sticker Price**: Ranking optimizes for total known landed cost, warranty, thermal performance, upgradeability, and seller reliability rather than lowest sticker price.
3. **Deterministic Money Logic**: Mathematical operations, landed cost arithmetic, constraint checks, scoring, plan hashes, approvals, and payment states are pure code—never LLM output.
4. **Human Control at the Money Boundary**: No checkout initiation without an immutable purchase plan, verified cryptographic SHA-256 hash, and explicit user approval.
5. **Capability-Aware Checkout**: The platform only offers actions a merchant supports (`DEMO_PAYPAL`, `MERCHANT_API`, `HANDOFF_ONLY`).
6. **Zero Real-World Transaction Simulation**: Transactions are strictly executed in verified sandbox environments (PayPal Orders v2) or explicitly flagged as `SIMULATED` in demo environments.

---

## Screen-by-Screen User Journey

The user interface follows a strict 4-step workflow:

```
[1. Brief] ─────────► [2. Compare] ─────────► [3. Approve] ─────────► [4. Confirm]
```

### Screen 1: Brief Screen (`/`)
- **Natural Language Request**: Textarea capturing user intent (e.g., *"A laptop for programming and ML experiments, some gaming on the side. Max $1,800 including shipping. Good thermals, upgradeable RAM, and at least a 2-year warranty."*).
- **Targeted Clarification Question**: Single question per turn to resolve critical exclusions (e.g. CUDA support for machine learning workloads) before searching.
- **Live Structured Brief (Schema v3)**: Displays category (`Inferred`), budget cap (`You said`), must-haves, use cases, and preference weight distribution bars (Thermals, Upgradeability, GPU performance, Battery life).
- **Offer Sources Transparency**: Live status chips for Seeded demo catalog (`Demo data`), Catalog Provider A (`Healthy`), and Catalog Provider B (`Healthy`).

### Screen 2: Compare Screen (`/compare`)
- **Recommendation Card ("Best fit for your brief")**:
  - Highlights the top-ranked candidate (*Halden Vector 16* at `$1,649.00 USD`).
  - Score Ring displaying deterministic score (`86 / 100`, Model v1.1).
  - *"Why this one"* explanation box guarded against hallucination.
  - Interactive Score Breakdown bars: Requirement fit (32.2 pts), Performance per dollar (21.0 pts), Price attractiveness (10.7 pts), Seller confidence (13.2 pts), Ownership value (9.0 pts).
- **Price Intelligence Card**:
  - Historical sparkline trend with Low (`$1,629`), Now (`$1,649`), High (`$1,719`).
  - Precedence-ordered buy advice box: *"Reasonable to buy now. Price sits $30 under the 23-day median and urgency is normal."*
  - Historic-low safety gate refusing claims without $\ge 20$ snapshots over $\ge 60$ days.
- **Seller Signals Card**:
  - Verified ratings (`4.7` from 1,240 reviews), return policies, and pricing anomalies.
- **Eligible Candidates Table & Excluded Panels**:
  - Eligible: *Halden Vector 16* (Score 86), *Kestrel Pro 16* (Score 81), *Orbis Atlas 15* (Score 78).
  - Over Budget: *Halden Vector 16 Max* (`$2,149.00` — `$349` over cap).
  - Flagged: *Lumen Aero 16* (`$899.00` — 45% below comparable median and unverified identity).

### Screen 3: Review & Approve Screen (`/approve`)
- **Purchase Plan Receipt**:
  - Locked snapshot badge (`v3 · plan_7f3a9c...e21b`).
  - Line items: *Halden Vector 16 · 32 GB · 1 TB × 1*, *Brightline Electronics* (`Provider-reported`), `$1,649.00` item price, `$0.00 merchant-stated` shipping, `Unknown not included in total` tax.
  - Landed Cost: `$1,649.00 USD`.
  - Re-verification chips: *Price and stock re-verified 38 s ago*, *Valid for 10 min*, *30-day returns · 36-mo warranty*.
- **Checkout Capability Chooser**:
  - Select between *Sandbox demo checkout* (`Demo` badge) and *Open the seller's page* (`Handoff` badge).
- **Purchase Lifecycle Timeline**:
  - 7-step progression: Draft $\rightarrow$ Reviewed $\rightarrow$ Approved $\rightarrow$ Order created $\rightarrow$ Payer action $\rightarrow$ Capture $\rightarrow$ Completed.
- **YOUR APPROVAL Card**:
  - Checkbox acknowledgment: *"I have reviewed the item, seller, quantity, amount and currency, and I understand tax is not yet included."*
  - Strict human agency: *Approve this exact amount* button is disabled until checked.
  - Re-checks plan hash and 600-second TTL before submitting.

### Screen 4: Confirmed Screen (`/confirm`)
- **Deep Forest Teal Hero Banner**:
  - `PAYMENT VERIFIED` chip with checkmark icon.
  - Heading: *Paid, and confirmed by PayPal.*
  - Verification copy: *We marked this paid only after the server verified the capture with PayPal, then reconciled it against the webhook event.*
  - Captured total: `$1,649.00 USD · sandbox transaction`.
- **Receipt Breakdown**:
  - Merchant: *ProcurePilot Demo Store (sandbox)*.
  - Capture Status: `COMPLETED`.
  - PayPal Order ID and plan hash link.
- **Immutable 9-Event Audit Trail**:
  - `18:02:11` Brief validated against schema v3 `[System]`
  - `18:02:19` Search run: 2 sources answered, 1 timed out `[Partial]`
  - `18:02:20` 16 offers scored; 3 eligible, 1 over budget, 1 flagged `[Computed]`
  - `18:04:47` Purchase plan v3 locked with price re-verified `[Verified]`
  - `18:05:30` Approval recorded for $1,649.00 USD, bound to plan hash `[You]`
  - `18:05:31` PayPal order created with idempotency key `[Server]`
  - `18:06:02` Payer approved in PayPal `[PayPal]`
  - `18:06:03` Capture executed server-side and verified COMPLETED `[Verified]`
  - `18:06:09` Webhook received, signature checked, duplicate ignored `[Reconciled]`

---

## Technical Stack & Architecture

- **Framework**: Next.js 16 (App Router, Turbopack, React 19).
- **Language**: TypeScript (strict mode, noImplicitAny, exactOptionalPropertyTypes).
- **Styling**: Tailwind CSS with bespoke design tokens (`#F5F2EA` warm canvas, `#16191C` ink black, `#0E5A55` deep forest teal).
- **Database & ORM**: PostgreSQL (hosted on Neon cloud or Docker) with Prisma Client.
- **Payments**: PayPal Orders v2 REST API + Deterministic Simulated Adapter.
- **Testing**: Vitest + JSDOM for unit, golden regression, and end-to-end lifecycle testing.
- **Module Boundaries**: ESLint flat config enforcing architectural isolation:
  - `src/domain/**` is pure: never imports from `app/**`, `src/ai/**`, `src/payments/**`, `src/providers/**`, or `components/**`.
  - `src/payments/**` is the sole consumer of PayPal payment adapters.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 26.x)
- PostgreSQL database (or Neon cloud database URL)

### 2. Installation
```bash
git clone https://github.com/AyushAwasthi52/ProcurePilot.git
cd ProcurePilot
npm install
```

### 3. Environment Variables
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
```

Key environment configuration:
```env
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
AUTH_SECRET="your-32-char-secure-auth-secret"
PAYPAL_CLIENT_ID="your-paypal-sandbox-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-sandbox-client-secret"
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
PAYMENTS_SIMULATED="false"
```

### 4. Database Initialization & Seed
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Running the Application
```bash
# Start Next.js development server
npm run dev
```
Navigate to `http://localhost:3000` to interact with the full application walkthrough.

---

## Quality Assurance & Automated Testing

All platform guarantees are backed by automated tests:

```bash
# Run all 20 test suites (88+ automated tests)
npm test

# Run strict TypeScript typecheck
npm run typecheck

# Enforce ESLint 9 boundary rules
npm run lint

# Build production bundle
npm run build
```

### Test Suite Overview:
- `tests/golden/scoring.test.ts`: Golden scoring regression benchmarks (Section 6.4 & 14.4).
- `tests/e2e/lifecycle.test.ts`: Complete 10-stage autonomous purchasing lifecycle from brief to webhook reconciliation.
- `tests/unit/payment-state-machine.test.ts`: Valid payment state transitions and illegal jump rejections.
- `tests/unit/payment-orders.test.ts`: Order creation, capture verification, and webhook deduplication.
- `tests/unit/purchase-plan.test.ts`: Canonical SHA-256 hash determinism, 600s TTL expiry, and approval binding.
- `tests/unit/price-statistics.test.ts`: Median, MAD, and $3\times\text{MAD}$ outlier filtering.
- `tests/unit/price-rules.test.ts`: Buy advice rules, urgency overrides, and historic-low safety gates.
- `tests/unit/trust-rules.test.ts`: Trust rules TR-01 through TR-08.
- `tests/unit/explanation-guard.test.ts`: Factual alignment guard and template fallback.
- `tests/unit/normalizer.test.ts`: Provider offer canonicalization and cross-provider deduplication.
- `tests/unit/search-orchestration.test.ts`: Parallel search dispatch, 6s timeout, and cancellation.
- `tests/unit/auth.test.ts`: HMAC-SHA256 session tokens and IDOR ownership isolation.

---

## Architectural Decision Records (ADRs)

Detailed architectural choices are documented in `docs/adr/`:
- **ADR-001**: Modular Monolith Architecture & Module Isolation.
- **ADR-002**: Integer Minor Units for Monetary Values (Zero Floating Point Drift).
- **ADR-003**: Provider Adapter Contract & Bounded Search Orchestration.
- **ADR-004**: Purchase Plan Expiry (600s TTL), SHA-256 Canonical Hash, and Approval Binding.
- **ADR-005**: Capability-Aware Checkout Registry.

---

## Security Model & Production Readiness

- **Content-Security-Policy (CSP)**: Strict headers configured in `next.config.mjs` restricting scripts, frames, and API connections.
- **Rate Limiting Middleware**: In-memory token bucket sliding window (`middleware.ts`) on all `/api/*` routes returning 429 when abused.
- **IDOR Defense**: All resource endpoints enforce user session ownership; mismatched IDs return HTTP 404 (`NotFoundError`) to prevent resource existence enumeration.
- **Append-Only Audit Logging**: All sensitive mutations (`BRIEF_VALIDATED`, `PLAN_LOCKED`, `PLAN_APPROVED`, `ORDER_CREATED`, `PAYMENT_CAPTURED`, `PAYMENT_RECONCILED`) write to structured audit logs.
- **CSRF & HMAC Sessions**: Double-submit CSRF protection on mutating HTTP requests with HMAC-SHA256 signed session cookies.

---

## License
MIT License. Built according to ProcurePilot Technical Specification v1.1.

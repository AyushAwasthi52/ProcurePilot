# ProcurePilot

> **Autonomous Purchasing Intelligence Platform**  
> AI-assisted procurement intelligence, deterministic decision-scoring, and capability-aware payment orchestration.

ProcurePilot helps buyers translate their requirements into a checkable brief, discovers offers across permitted sources, normalizes attributes, evaluates fit and value deterministically, and presents evidence-backed recommendations. Once approved, the platform guides checkout only through paths the merchant actually supports (PayPal Sandbox demo checkout, direct merchant API, or guided seller handoff).

---

## Authoritative Architecture Principles

1. **Evidence Before Confidence**: Every recommendation cites its source, timestamp, and field provenance (You said, Inferred, Provider-reported, Verified, Computed).
2. **Total Value Over Sticker Price**: Ranking optimizes for total known landed cost, warranty, upgradeability, and seller reliability.
3. **Deterministic Money Logic**: Mathematical operations, constraints, scoring, approvals, and payment states are pure code—never LLM output.
4. **Human Control at the Money Boundary**: No checkout initiation without an immutable purchase plan, verified cryptographic hash, and explicit user approval.
5. **Capability-Aware Checkout**: The platform only offers actions a merchant supports (`DEMO_PAYPAL`, `MERCHANT_API`, `HANDOFF_ONLY`).
6. **No Real-World Transaction Simulation**: Transactions are strictly executed in verified sandbox environments or explicitly flagged as `SIMULATED` in non-production environments.

---

## Project Structure

```
procurepilot/
├── app/                  # Next.js App Router (pages and API routes)
│   ├── (app)/            # Application routes (brief, compare, review, confirmed)
│   └── api/              # Secure API route handlers
├── components/           # UI components matching design specifications
│   ├── layout/           # AppHeader, SandboxBanner, StepNav
│   └── ui/               # ProvenanceChip, ScoreRing, etc.
├── docs/                 # Architecture Decision Records (ADRs) and specs
├── prisma/               # Database schema, migrations, and seed scripts
├── src/
│   ├── ai/               # Prompts, schemas, LLM client adapters, explanation guards
│   ├── domain/           # Pure domain models (Money, scoring, constraints, plan hash)
│   ├── payments/         # PayPal Orders v2 adapter, state machine, reconciliation
│   ├── providers/        # Catalog provider adapters (seeded, external)
│   └── db/               # Prisma client and database helpers
└── tests/                # Unit, golden, contract, and integration tests
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 26.x)
- Docker & Docker Compose (for local PostgreSQL)

### Local Setup

1. **Clone repository and install dependencies**:
   ```bash
   git clone https://github.com/AyushAwasthi52/ProcurePilot.git
   cd ProcurePilot
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```

3. **Start local database**:
   ```bash
   docker compose up -d
   ```

4. **Run database migrations & seed catalog**:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

```bash
# Typecheck
npm run typecheck

# Linting and boundary rules
npm run lint

# Automated unit & golden tests
npm test
```

---

## Architecture Decision Records (ADRs)
- [ADR-001: Modular Monolith Architecture](docs/adr/ADR-001-modular-monolith.md)
- [ADR-002: Integer Minor Units for Currency](docs/adr/ADR-002-money-representation.md)
- [ADR-003: Provider Adapter Interface Contract](docs/adr/ADR-003-provider-adapter-contract.md)
- [ADR-004: Purchase Plan Expiry and Approval Binding](docs/adr/ADR-004-plan-expiry-approval-binding.md)
- [ADR-005: Capability-Aware Checkout Registry](docs/adr/ADR-005-capability-aware-checkout.md)

---

## License
MIT License. See [LICENSE](LICENSE) for details.


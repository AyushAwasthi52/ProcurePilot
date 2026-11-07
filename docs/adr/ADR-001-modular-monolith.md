# ADR-001: Modular Monolith Architecture & Module Boundary Enforcement

## Status
Accepted

## Context
ProcurePilot coordinates natural language requirement extraction, multi-source catalog discovery, deterministic scoring, immutable purchase plans, and payment state machines. We need strong modularity, clean domain isolation, fast development velocity, and end-to-end type sharing without the operational complexity of distributed microservices in the initial phases.

## Decision
We adopt a **modular monolith** built on Next.js (App Router) and TypeScript strict mode. 

### Module Boundaries
1. **Domain Isolation (`src/domain/**`)**:
   - Contains pure domain rules: Money calculation, scoring model, constraint evaluation, trust signal evaluation, and plan hash generation.
   - **Rule**: `src/domain/**` MUST NOT import from `app/**`, `src/ai/**`, UI components, or external provider SDKs.
2. **AI Layer (`src/ai/**`)**:
   - Contains prompt definitions, structured Zod schemas, LLM client adapters, and explanation verification guards.
   - **Rule**: AI outputs are strictly treated as untrusted data until validated by Zod and domain invariants.
3. **Payments Layer (`src/payments/**`)**:
   - Sole owner of payment integrations, PayPal SDK clients, simulated payment adapters, order creation, capture, and webhook verification.
   - **Rule**: No other module may directly communicate with PayPal or manipulate payment status.
4. **API and UI (`app/**`, `components/**`)**:
   - Interface layers that orchestrate domain calls and present verified states to the user. No business calculations or payment logic may reside in React components.

Boundary violations are enforced through ESLint import rules and automated tests in CI.

## Consequences
- Fast developer feedback loop and direct refactoring across server endpoints and clients.
- Prevents architectural erosion and domain leakage.
- High testability: domain algorithms can be tested as pure, deterministic unit tests without network or database dependencies.

# ProcurePilot - Agent Instructions

You are working on ProcurePilot, an AI-assisted autonomous
purchasing intelligence platform.

Before making changes:
1. Read README.md.
2. Read IMPLEMENTATION_STATUS.md.
3. Read the relevant technical documentation.
4. Inspect the actual implementation and tests.
5. Understand the complete execution path before editing.

Engineering principles:
- Evidence before claims.
- Never confuse demo data with live data.
- Never fabricate products, prices, merchants, ratings,
  availability, discounts or provider responses.
- Deterministic code owns financial calculations,
  constraints, scoring, approvals and payment states.
- LLMs handle natural language, extraction and explanations.
- All real financial transactions require explicit human approval.
- Preserve the modular monolith architecture.
- Keep domain logic independent of UI and provider SDKs.
- Use integer minor units for monetary values.
- Preserve ownership checks, authorization, CSRF protection,
  audit logging and payment safety boundaries.

Development workflow:
- Audit before implementation.
- Present a plan before modifying files.
- Implement one bounded phase at a time.
- Add meaningful tests.
- Run typecheck, lint, tests and build where applicable.
- Never weaken tests just to obtain a passing CI run.
- Report exact changes, test results and remaining limitations.
- Do not mark documentation complete without verifying code.

The developer is the architect and reviewer.
Do not silently make major architectural decisions.

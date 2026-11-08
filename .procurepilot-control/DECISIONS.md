# Architectural Decisions

## ADR-001 — Repository-backed control plane
Status: Accepted

Use version-controlled task/context/report files as the durable handoff between Antigravity and the ChatGPT auditor. Do not claim that this exposes the private/live transcript of a particular ChatGPT chat to Antigravity. The developer invokes the auditor in ChatGPT, which reads repository state and writes review feedback.

## ADR-002 — Bounded autonomous implementation
Status: Accepted

Antigravity may autonomously implement, test, and iterate on the currently authorized task. It must stop after at most 3 implementation/audit iterations, on a blocker requiring human input, or when the task is accepted. It must not merge, deploy, or perform real purchases/payments.

## ADR-003 — Evidence-based acceptance
Status: Accepted

Acceptance requires actual diff review, exact test commands and exit codes, relevant automated tests, and end-to-end verification for the affected user journey. Typecheck/build success alone is insufficient.

## ADR-004 — Human-controlled trust boundary
Status: Accepted

Only the developer approves architectural scope changes, provider terms/credentials, release/deployment, merge to main, and financial actions. Antigravity cannot mark its own work accepted. The auditor may recommend acceptance; the developer retains final authority.

## ADR-005 — No invented integrations
Status: Accepted

A provider adapter is not a live integration until it calls a real documented API with valid configuration and its response is validated and normalized. Fixture fallback must remain visibly demo data.

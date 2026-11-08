# Task PP-001 — Repair the broken request-to-comparison vertical slice

Status: READY  
Priority: P0  
Maximum audit iterations: 3  
Authorized scope: reproduce and repair request creation, PurchaseBrief persistence/retrieval, and comparison rendering. Do not implement new shopping providers in this task.

## Observed failures
1. Prompt keyboard produced an internal server error on the brief screen.
2. The comparison page crashed at app/compare/page.tsx:214 because brief.budget was undefined while reading amountMinor.

The actual root cause remains unknown. Reproduce it and trace the data contract.

## Acceptance criteria
- Reproduce the keyboard request failure and identify the exact server-side root cause.
- Trace PurchaseBrief from extraction through persistence and API retrieval to comparison rendering.
- Validate the canonical brief at external/database boundaries with Zod.
- Handle legacy or incomplete records explicitly; never invent a zero/default budget.
- Make comparison UI resilient to incomplete records and show a recoverable state instead of crashing.
- Ensure stale async analysis cannot overwrite a newer prompt/request.
- Add regression tests for missing budget, null/malformed brief, valid keyboard request, failed extraction/request creation, and successful request-to-comparison flow.
- Preserve auth, ownership, CSRF, financial safety and existing product functionality.
- Do not add SerpApi/eBay integration in this task.

## Required verification
Run and report exact exit codes for npm test, npm run typecheck, npm run lint, and npm run build.

Also perform the browser journey: keyboard → structured brief or clarification → search → comparison page.

## Reporting
Submit an append-only JSON report under .procurepilot-control/reports/ using the MCP tool submit_implementation_report. Include task ID, iteration, branch, commit SHA, root cause and evidence, changed files, exact commands and exit codes, test counts, manual browser verification, limitations and human decisions needed.

Do not mark this task accepted. Wait for auditor feedback.

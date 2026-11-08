# ProcurePilot Autonomous Engineering Control Plane

This directory is the durable, repository-backed handoff between the developer, Antigravity, and the ChatGPT auditor.

## Roles
- Developer: owns the repository and approves scope, secrets, releases, merges, and any financial action.
- Antigravity: autonomous implementation agent. It may inspect, edit, test, and iterate within the current task.
- ChatGPT auditor: reviews submitted evidence and diffs when the developer brings the workflow into the ChatGPT conversation. It writes audit feedback into this directory through the connected GitHub workflow.

## Important limitation
This repository is the shared memory/transport. It does not stream this specific ChatGPT conversation into Antigravity, nor does it cause ChatGPT to run continuously in the background. The auditor sees the current task context and repository state when invoked in ChatGPT. Do not claim a live bidirectional chat connection.

## Files
- PROJECT_CONTEXT.md: durable project facts and invariants.
- DECISIONS.md: approved architectural decisions.
- NEXT_TASK.md: one bounded task Antigravity is authorized to execute.
- AUDIT_FEEDBACK.md: latest auditor findings and acceptance status; only the ChatGPT auditor/developer should change acceptance status.
- reports/: append-only implementation and test reports.

## Autonomous loop
1. Antigravity reads project context, decisions, task, and latest audit feedback.
2. It inspects the actual repository and creates a task plan.
3. It implements the task in a dedicated branch, runs required checks, and submits a report.
4. It reads audit feedback. If changes are requested, it fixes them and submits a new report.
5. It stops when the auditor marks the task ACCEPTED, when a human decision is needed, or after 3 implementation/audit iterations.
6. It never merges, deploys, changes secrets, or performs real purchases.

## Evidence rules
A task is not complete because a page renders or TypeScript compiles. Reports must include commit SHA, changed files, exact commands and exit codes, test evidence, manual verification steps, known limitations, and screenshots/log excerpts where relevant. Never include secrets or personal data in reports.

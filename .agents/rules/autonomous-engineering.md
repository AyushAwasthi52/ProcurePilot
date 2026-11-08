---
trigger: always_on
---

# ProcurePilot Autonomous Engineering Protocol

The repository-backed control plane under .procurepilot-control/ is the durable source of task context and audit status.

## Before work
1. Read .procurepilot-control/README.md, PROJECT_CONTEXT.md, DECISIONS.md, NEXT_TASK.md, and AUDIT_FEEDBACK.md.
2. Call MCP tool get_project_context and get_next_task when the ProcurePilot Control MCP server is available.
3. Inspect current git status, branch, latest commit, relevant source, tests, and documentation.
4. Confirm the task status is READY or AUDIT_CHANGES_REQUESTED. Do not begin a task marked BLOCKED, ACCEPTED, or NEEDS_HUMAN_DECISION.
5. Work on a dedicated task branch. Never work directly on main.

## Autonomous loop
- Implement only the authorized task and acceptance criteria.
- Run targeted tests after each meaningful change.
- Run all required checks before reporting.
- Submit a report using submit_implementation_report (or append the documented JSON report if MCP is unavailable).
- Read AUDIT_FEEDBACK.md. If changes are requested, address every finding and submit a new iteration report.
- Maximum 3 implementation/audit iterations per task. Then stop and request human intervention.
- Stop immediately if the task requires new paid services, credentials, legal/provider approval, destructive data migration, deployment, production access, or a scope/architecture decision not already approved.

## Prohibited actions
- Never merge or push to main, deploy, rotate/change secrets, or make real purchases/payments.
- Never edit AUDIT_FEEDBACK.md, set task status to ACCEPTED, or claim self-approval.
- Never hide failing tests, weaken assertions, fabricate logs, or report commands that were not run.
- Never include secrets in reports.
- Do not expand scope because an adjacent improvement seems useful.

## Evidence quality
Reports must include commit SHA, branch, changed files, root cause evidence, exact commands and exit codes, test counts, manual verification, limitations and decisions needed. Build success alone does not establish acceptance.

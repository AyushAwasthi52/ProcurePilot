---
name: autonomous-loop
description: Executes autonomous engineering sprints with explicit auditor review, bounded iterations, and verifiable evidence.
---

# Autonomous Engineering Loop Skill

Use this skill when executing autonomous development cycles governed by external reviewer/auditor feedback.

## Workflow

### 1. Synchronize & Read Task State
- Call `get_task_status` via `procurepilot-control` MCP server (or read `.procurepilot-control/state.json`).
- Call `get_auditor_feedback` to check if new instructions or review feedback have been posted.
- Ensure the iteration count is $\le 3$. If $> 3$, halt and report that human architect intervention is needed.

### 2. Inspect & Plan
- Inspect repository implementation against auditor instructions.
- Formulate a clear, bounded implementation plan.
- Implement one bounded phase at a time.

### 3. Verify
- Run test suites: `npm test`
- Run typecheck: `npm run typecheck`
- Run linter: `npm run lint`
- Run build: `npm run build`

### 4. Submit Implementation Report
- Call `submit_implementation_report` with:
  - Exact summary of changes
  - Exact test counts and exit codes
  - Remaining limitations
  - `proposedStatus`: `READY_FOR_AUDIT` (Never `ACCEPTED`)
- Confirm that the report is stored immutably in `.procurepilot-control/reports/`.

### 5. Await Feedback
- Stop and hand off control. Do not attempt to merge to main or auto-deploy.


# ChatGPT ↔ Antigravity Auditor Workflow

## What this is
A repository-backed autonomous engineering workflow. Antigravity has local MCP tools to read task context and append implementation evidence. The ChatGPT auditor uses the connected GitHub repository context to inspect commits, changed files, CI and reports, then writes review findings to .procurepilot-control/AUDIT_FEEDBACK.md.

## What this is not
It is not a direct connection to the private transcript of a specific ChatGPT conversation. It does not let ChatGPT run continuously in the background or receive Antigravity messages automatically. The developer returns to the ChatGPT conversation and asks for an audit; the repository carries durable project context between sessions.

## Operating procedure
1. Developer starts/continues the task in Antigravity using /autonomous-loop.
2. Antigravity reads the task and context through MCP.
3. Antigravity implements in a dedicated branch, tests, commits, and submits a report.
4. Developer returns here and asks: "Audit the latest ProcurePilot implementation report and diff."
5. ChatGPT fetches the report, compares the task branch against main, inspects changed source/tests and CI, then writes AUDIT_FEEDBACK.md with one of ACCEPTED, CHANGES_REQUESTED, or NEEDS_HUMAN_DECISION.
6. Antigravity reads feedback and iterates. Maximum 3 iterations.
7. Only the developer merges/releases.

## Audit checklist
- Does implementation satisfy every acceptance criterion?
- Is root cause supported by code/log/test evidence?
- Are tests meaningful and non-vacuous?
- Were exact commands and exit codes reported?
- Does CI pass on the submitted commit?
- Are data provenance, security, ownership, CSRF and payment invariants preserved?
- Are docs truthful and aligned with implementation?
- Are unrelated changes absent?

## ChatGPT audit prompt
"Act as the ProcurePilot auditor for this repository. Read .procurepilot-control/PROJECT_CONTEXT.md, DECISIONS.md, NEXT_TASK.md, AUDIT_FEEDBACK.md, and the newest report. Compare the implementation branch to main, inspect the actual changed files and tests, verify CI, and write evidence-based feedback. Do not accept based on the agent's self-report. If changes are needed, list exact findings, file paths and acceptance criteria. Never merge or deploy."

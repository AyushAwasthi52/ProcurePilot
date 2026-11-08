---
name: autonomous-loop
description: Execute the currently authorized ProcurePilot task autonomously, submit evidence, consume auditor feedback, and iterate within strict safety limits.
---

# ProcurePilot Autonomous Engineering Loop

Use this skill when asked to continue the authorized ProcurePilot task.

1. Read all files under .procurepilot-control/ referenced by its README.
2. Use MCP tools get_project_context, get_next_task, and get_audit_feedback if available.
3. Inspect the current branch and working tree. Do not overwrite uncommitted user changes.
4. Implement only the task in NEXT_TASK.md.
5. Add regression tests and run required checks.
6. Submit a structured report using submit_implementation_report.
7. Read updated audit feedback. If findings are actionable, fix them and submit another report.
8. Stop after acceptance, a human-decision blocker, or 3 iterations.

Never edit the audit feedback file, self-accept, merge, deploy, or perform a real financial action.

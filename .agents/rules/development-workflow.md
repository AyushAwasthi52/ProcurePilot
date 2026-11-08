---
trigger: always_on
---

# Development Workflow

1. Understand the user's requested outcome.
2. Inspect the existing implementation.
3. Identify affected files and dependencies.
4. Separate existing functionality from missing functionality.
5. Present a concise implementation plan.
6. Wait for approval before substantial modifications.
7. Implement the smallest complete vertical slice.
8. Add or update tests.
9. Run relevant validation commands.
10. Report results and remaining limitations.

Never:
- Rewrite working modules without justification.
- Replace real functionality with hardcoded demonstrations.
- Create placeholder integrations and call them complete.
- Modify unrelated files without a reason.
- Claim tests passed without actually running them.
- Claim a feature works based only on TypeScript compilation.

When a task is ambiguous, ask one focused clarification.

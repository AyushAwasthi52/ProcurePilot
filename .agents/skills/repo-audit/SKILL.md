---
name: repo-audit
description: Performs evidence-based ProcurePilot repository audits.
  Use when inspecting feature completeness, architecture, bugs,
  implementation status, technical debt or integration readiness.
---

# ProcurePilot Repository Audit

## Objective
Determine what actually works, what is partial, what is mocked
and what is missing.

## Procedure

1. Read:
   - AGENTS.md
   - README.md
   - IMPLEMENTATION_STATUS.md
   - Relevant architecture documentation.

2. Identify the feature and its expected user-visible behavior.

3. Trace its complete execution path:
   - Frontend component
   - API route
   - Validation/schema
   - Application service
   - Domain logic
   - Database queries
   - External provider or AI integration
   - Result rendering

4. Inspect relevant tests.
   Determine what they actually verify, not merely their names.

5. Search for:
   - Hardcoded values
   - Static arrays and fixtures
   - Mock implementations
   - Silent fallback paths
   - Dead code
   - Incomplete error handling
   - Stale asynchronous state
   - Missing persistence
   - Unused environment variables
   - Misleading UI claims

6. Classify each capability:

   IMPLEMENTED_AND_VERIFIED
   IMPLEMENTED_BUT_UNVERIFIED
   PARTIALLY_IMPLEMENTED
   MOCKED_OR_HARDCODED
   MISSING

7. For integrations, establish whether they are:
   - Real external API integrations
   - Configured but inactive
   - Local fixtures
   - Seeded database records
   - Mock adapters

## Output

Produce:

1. Executive summary
2. Feature-by-feature status
3. Execution-path trace
4. Evidence with file paths and relevant symbols
5. Bugs and architectural risks
6. Missing acceptance criteria
7. Prioritized recommendations
8. Proposed implementation phases

Do not modify files during an audit unless explicitly asked.

Never infer implementation from documentation alone.
Verify documentation claims against source code.

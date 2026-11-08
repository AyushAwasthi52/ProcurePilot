---
name: implement-feature
description: Plans and implements bounded ProcurePilot features.
  Use when building, modifying, refactoring or completing a feature.
---

# ProcurePilot Feature Implementation

## Phase 1: Understand

1. Read project instructions and architecture documentation.
2. Run repo-audit mentally or invoke the repo-audit skill.
3. Inspect existing modules and tests.
4. Identify reusable abstractions.
5. Identify affected database models and APIs.

## Phase 2: Plan

Before editing, present:

- Feature objective
- Current behavior
- Expected behavior
- Files to modify
- Files to create
- Database changes
- API contract changes
- Dependencies
- Security implications
- Failure cases
- Acceptance criteria
- Test plan

Wait for developer approval.

## Phase 3: Implement

- Work in small, coherent changes.
- Preserve existing contracts unless changes are justified.
- Prefer extending existing abstractions.
- Keep domain logic deterministic.
- Validate inputs and external responses.
- Handle failures explicitly.
- Do not fabricate data.
- Do not introduce unrelated features.

## Phase 4: Verify

Run applicable:

- npm run typecheck
- npm run lint
- npm test
- npm run build

Add tests for the new behavior.

Do not claim success if commands were skipped or failed.

## Phase 5: Report

Report:

- Files changed
- Architecture decisions
- Database/API changes
- Tests executed and actual results
- Known limitations
- Remaining work
- Suggested commit message

Do not silently proceed to another major phase.

# ProcurePilot Autonomous Auditor Workflow

This document specifies the bidirectional communication protocol between **Antigravity** (the coding assistant) and the **External Auditor / Architect** (such as ChatGPT, human reviewers, or CI review bots).

---

## 1. Architectural Principles

1. **Independent Verification**: The auditor verifies claims against code diffs and test runs, never trusting claims without reproduction.
2. **Explicit Interface Boundary**: External auditors do not possess access to Antigravity's internal conversation transcript. Communication takes place strictly through version-controlled files, GitHub PRs/issues, and the `.procurepilot-control/` directory.
3. **Immutable Append-Only Audit Trail**: Implementation reports are never overwritten. Every iteration generates a new immutable report file:
   `.procurepilot-control/reports/report_iter_<iteration>_<timestamp>.json`
4. **No Self-Acceptance**: Antigravity is prohibited from marking its own work `ACCEPTED`. Only the auditor may approve a task.
5. **Bounded Loop ($\le 3$ Iterations)**: If consensus or resolution is not reached within 3 iterations, autonomous execution stops and escalates to the human architect.
6. **No Automated Merging or Deployment**: Feature branches and stabilization sprints are never merged to `main` or deployed to production automatically.

---

## 2. Directory Layout (`.procurepilot-control/`)

```
.procurepilot-control/
├── state.json                  # Active task state, iteration count, branch, and commit
├── tasks/                      # Task specifications and requirements
├── reports/                    # Immutable implementation reports submitted by Antigravity
│   └── report_iter_1_*.json
└── feedback/                   # Review feedback and instructions from the Auditor
    └── feedback_iter_1.md
```

---

## 3. Communication Lifecycle

### Step 1: Auditor Issues Instructions
The auditor places instructions or review feedback in `.procurepilot-control/feedback/feedback_iter_<N>.md` or creates a GitHub issue/PR review.

### Step 2: Antigravity Inspects & Implements
Antigravity reads task state and feedback via the `procurepilot-control-mcp` tools (`get_task_status`, `get_auditor_feedback`), formulates a plan, modifies files, and writes tests.

### Step 3: Verification
Antigravity runs all verification commands:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Step 4: Antigravity Submits Implementation Report
Antigravity calls `submit_implementation_report`, which:
- Records the exact branch and commit hash (`git rev-parse HEAD`).
- Captures test results and remaining limitations.
- Enforces `proposedStatus: "READY_FOR_AUDIT"`.
- Increments the iteration counter in `state.json`.

### Step 5: Auditor Reviews & Accepts or Directs Next Iteration
- If accepted: The auditor sets `accepted: true` in `state.json` or signs off on GitHub.
- If revisions required: The auditor provides `feedback_iter_<N+1>.md` (up to iteration 3).
- If iteration 3 completes without acceptance: Autonomous work halts for human engineering intervention.


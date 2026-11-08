# Autonomous Engineering Governance Rules

## Core Principles
1. **Evidence Before Claims**: Never claim a feature is working or verified without executing automated tests and recording real command output.
2. **Append-Only Reporting**: Implementation reports must be strictly append-only. Never overwrite or erase prior audit logs or reports.
3. **Exact Provenance & Traceability**: Every report must identify the exact `taskId`, `iteration`, `branch`, and HEAD `commit`.
4. **No Self-Acceptance**: Antigravity is the implementation agent; the external reviewer (auditor / architect) is the sole authority for task acceptance. Never mark your own task as `ACCEPTED`.
5. **Iteration Bound (≤ 3)**: A task is limited to a maximum of 3 audit feedback iterations. If the task is not accepted by iteration 3, autonomous looping must stop and human escalation is required.
6. **No Automated Merging or Deployment**: Never automatically merge feature branches to `main` or trigger production deployment. Merging and deployment remain human/architect actions.
7. **Explicit Auditor Bridge**: External reviewers (e.g. ChatGPT, GitHub PR reviewers) communicate via explicit repository audit files (`.procurepilot-control/feedback/`, PR review comments, or GitHub issues). Do not claim external auditors have direct visibility into Antigravity's private conversation transcript.


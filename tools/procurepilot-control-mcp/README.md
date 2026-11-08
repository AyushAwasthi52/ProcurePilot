# ProcurePilot Control MCP Server

Local stdio MCP server for Antigravity. It exposes read-only project/task/audit context and one append-only report submission tool.

## Install
From repository root:
- cd tools/procurepilot-control-mcp
- npm install
- cd ../..

The dependency is isolated to this tool and does not change the ProcurePilot application runtime.

## Configure
Workspace config: .agents/mcp_config.json. It starts node tools/procurepilot-control-mcp/server.mjs.

Antigravity documents workspace MCP configuration at .agents/mcp_config.json. Open Antigravity MCP Servers settings or CLI /mcp manager and reload the server. Documentation: https://antigravity.google/docs/mcp.

## Tools
- get_project_context
- get_next_task
- get_audit_feedback
- submit_implementation_report

The server does not expose arbitrary shell execution, git push, merge, deployment, secret access, or audit acceptance tools.

## Smoke test
After installing, configure the server in Antigravity and verify all four tools appear. Ask Antigravity to call the three read tools. Do not submit fabricated evidence to the active task.

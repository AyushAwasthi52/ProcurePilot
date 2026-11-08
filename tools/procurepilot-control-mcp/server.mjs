#!/usr/bin/env node

import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const CONTROL_DIR = path.join(ROOT_DIR, ".procurepilot-control");
const REPORTS_DIR = path.join(CONTROL_DIR, "reports");
const FEEDBACK_DIR = path.join(CONTROL_DIR, "feedback");
const TASKS_DIR = path.join(CONTROL_DIR, "tasks");
const STATE_FILE = path.join(CONTROL_DIR, "state.json");

// Ensure control plane directories exist
for (const dir of [CONTROL_DIR, REPORTS_DIR, FEEDBACK_DIR, TASKS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getGitMetadata() {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
    const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    return { branch, commit };
  } catch {
    return { branch: "unknown", commit: "unknown" };
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch {
      // ignore
    }
  }
  const { branch, commit } = getGitMetadata();
  const defaultState = {
    taskId: "task-stabilization-001",
    taskTitle: "Stabilize category-agnostic purchasing, provider integrations and data integrity",
    status: "IN_PROGRESS",
    branch,
    commit,
    iteration: 1,
    maxIterations: 3,
    auditorFeedbackPending: false,
    accepted: false,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2), "utf8");
  return defaultState;
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

const TOOLS = [
  {
    name: "get_task_status",
    description: "Get the current task state, iteration number, commit hash, and auditor feedback status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_auditor_feedback",
    description: "Read the latest auditor review and instructions for the task to avoid stale feedback.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID (defaults to active task)" },
        iteration: { type: "number", description: "Specific iteration (defaults to latest)" },
      },
    },
  },
  {
    name: "submit_implementation_report",
    description: "Append an immutable implementation report for auditor review. Strictly prohibits self-acceptance and enforces iteration limits.",
    inputSchema: {
      type: "object",
      required: ["summary", "changesMade", "testResults", "proposedStatus"],
      properties: {
        taskId: { type: "string" },
        summary: { type: "string" },
        changesMade: {
          type: "array",
          items: { type: "string" },
        },
        testResults: {
          type: "object",
          properties: {
            testsPassed: { type: "number" },
            testsFailed: { type: "number" },
            typecheckPassed: { type: "boolean" },
            lintPassed: { type: "boolean" },
            buildPassed: { type: "boolean" },
          },
          required: ["testsPassed", "testsFailed", "typecheckPassed", "lintPassed", "buildPassed"],
        },
        remainingLimitations: {
          type: "array",
          items: { type: "string" },
        },
        proposedStatus: {
          type: "string",
          enum: ["READY_FOR_AUDIT", "BLOCKED"],
        },
      },
    },
  },
  {
    name: "sync_control_state",
    description: "Explicitly synchronize local control plane with current git branch and HEAD commit.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

function handleToolCall(name, args) {
  const state = loadState();
  const git = getGitMetadata();

  if (name === "get_task_status") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              taskId: state.taskId,
              taskTitle: state.taskTitle,
              iteration: state.iteration,
              maxIterations: state.maxIterations,
              currentBranch: git.branch,
              currentCommit: git.commit,
              auditorFeedbackPending: state.auditorFeedbackPending,
              status: state.status,
              accepted: state.accepted,
              iterationLimitReached: state.iteration >= state.maxIterations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_auditor_feedback") {
    const feedbackFiles = fs.existsSync(FEEDBACK_DIR)
      ? fs.readdirSync(FEEDBACK_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".json")).sort()
      : [];

    if (feedbackFiles.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hasFeedback: false,
              message: "No external auditor feedback found yet in .procurepilot-control/feedback/.",
              iteration: state.iteration,
            }),
          },
        ],
      };
    }

    const latestFile = feedbackFiles[feedbackFiles.length - 1];
    const content = fs.readFileSync(path.join(FEEDBACK_DIR, latestFile), "utf8");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            hasFeedback: true,
            filename: latestFile,
            iteration: state.iteration,
            content,
          }),
        },
      ],
    };
  }

  if (name === "submit_implementation_report") {
    // 1. Guard against self-acceptance
    if (args.proposedStatus === "ACCEPTED") {
      throw new Error("Antigravity cannot self-accept tasks. Acceptance is reserved exclusively for the external auditor.");
    }

    // 2. Guard against exceeding max iterations
    if (state.iteration > state.maxIterations) {
      state.status = "MAX_ITERATIONS_REACHED";
      saveState(state);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Audit iteration limit (${state.maxIterations}) exceeded. Autonomous execution halted. Human intervention required.`,
          },
        ],
      };
    }

    const reportTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFilename = `report_iter_${state.iteration}_${reportTimestamp}.json`;
    const reportPath = path.join(REPORTS_DIR, reportFilename);

    const reportData = {
      taskId: args.taskId || state.taskId,
      iteration: state.iteration,
      timestamp: new Date().toISOString(),
      git: {
        branch: git.branch,
        commit: git.commit,
      },
      summary: args.summary,
      changesMade: args.changesMade || [],
      testResults: args.testResults,
      remainingLimitations: args.remainingLimitations || [],
      proposedStatus: args.proposedStatus,
      governance: {
        selfAccepted: false,
        autoMerged: false,
        autoDeployed: false,
      },
    };

    // Append-only write
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), "utf8");

    // Update control state
    state.commit = git.commit;
    state.branch = git.branch;
    state.status = args.proposedStatus;
    state.auditorFeedbackPending = true;
    state.iteration += 1;
    saveState(state);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              savedReport: reportFilename,
              nextIteration: state.iteration,
              auditorFeedbackPending: true,
              governanceNotes: "Report recorded. Never auto-merging or deploying. Waiting for independent auditor feedback.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "sync_control_state") {
    state.branch = git.branch;
    state.commit = git.commit;
    saveState(state);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ synced: true, branch: git.branch, commit: git.commit }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const msg = JSON.parse(line);
    const { id, method, params } = msg;

    if (method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "procurepilot-control-mcp",
            version: "1.0.0",
          },
        },
      };
      process.stdout.write(JSON.stringify(response) + "\n");
      return;
    }

    if (method === "notifications/initialized") {
      return;
    }

    if (method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS,
        },
      };
      process.stdout.write(JSON.stringify(response) + "\n");
      return;
    }

    if (method === "tools/call") {
      try {
        const result = handleToolCall(params.name, params.arguments || {});
        process.stdout.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            result,
          }) + "\n"
        );
      } catch (err) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32603,
              message: err instanceof Error ? err.message : String(err),
            },
          }) + "\n"
        );
      }
      return;
    }

    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      }) + "\n"
    );
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
        },
      }) + "\n"
    );
  }
});


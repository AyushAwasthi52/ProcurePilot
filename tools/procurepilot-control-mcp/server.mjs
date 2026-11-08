import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.env.PROCUREPILOT_ROOT || process.cwd());
const CONTROL = path.join(ROOT, ".procurepilot-control");
const REPORTS = path.join(CONTROL, "reports");
const files = {
  project: path.join(CONTROL, "PROJECT_CONTEXT.md"),
  decisions: path.join(CONTROL, "DECISIONS.md"),
  task: path.join(CONTROL, "NEXT_TASK.md"),
  feedback: path.join(CONTROL, "AUDIT_FEEDBACK.md")
};

async function readText(file) {
  return fs.readFile(file, "utf8");
}

const ReportSchema = z.object({
  task_id: z.string().min(1).max(40),
  iteration: z.number().int().min(1).max(3),
  branch: z.string().min(1).max(120),
  commit_sha: z.string().min(7).max(64),
  summary: z.string().min(1).max(10000),
  root_cause: z.string().max(10000).optional(),
  changed_files: z.array(z.string().max(300)).max(200),
  commands: z.array(z.object({
    command: z.string().max(500),
    exit_code: z.number().int(),
    notes: z.string().max(3000).optional()
  })).max(50),
  tests: z.object({
    passed: z.number().int().nonnegative().optional(),
    failed: z.number().int().nonnegative().optional(),
    skipped: z.number().int().nonnegative().optional(),
    details: z.string().max(10000).optional()
  }).optional(),
  manual_verification: z.string().max(10000),
  limitations: z.array(z.string().max(2000)).max(50).default([]),
  human_decisions_needed: z.array(z.string().max(2000)).max(30).default([])
}).strict();

const server = new Server(
  { name: "procurepilot-control", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "get_project_context", description: "Read durable ProcurePilot product context and approved architecture decisions.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    { name: "get_next_task", description: "Read the currently authorized task. Do not execute tasks marked BLOCKED, ACCEPTED, or NEEDS_HUMAN_DECISION.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    { name: "get_audit_feedback", description: "Read latest auditor feedback. Antigravity must not modify or self-approve this feedback.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    {
      name: "submit_implementation_report",
      description: "Append an evidence-based implementation report. This tool cannot accept a task or modify auditor feedback.",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string" }, iteration: { type: "integer" }, branch: { type: "string" },
          commit_sha: { type: "string" }, summary: { type: "string" }, root_cause: { type: "string" },
          changed_files: { type: "array", items: { type: "string" } },
          commands: { type: "array", items: { type: "object", properties: {
            command: { type: "string" }, exit_code: { type: "integer" }, notes: { type: "string" }
          }, required: ["command", "exit_code"], additionalProperties: false } },
          tests: { type: "object", properties: {
            passed: { type: "integer" }, failed: { type: "integer" }, skipped: { type: "integer" }, details: { type: "string" }
          }, additionalProperties: false },
          manual_verification: { type: "string" },
          limitations: { type: "array", items: { type: "string" } },
          human_decisions_needed: { type: "array", items: { type: "string" } }
        },
        required: ["task_id", "iteration", "branch", "commit_sha", "summary", "changed_files", "commands", "manual_verification"],
        additionalProperties: false
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const name = request.params.name;
    if (name === "get_project_context") {
      const [project, decisions] = await Promise.all([readText(files.project), readText(files.decisions)]);
      return { content: [{ type: "text", text: project + "\n\n--- APPROVED DECISIONS ---\n\n" + decisions }] };
    }
    if (name === "get_next_task") return { content: [{ type: "text", text: await readText(files.task) }] };
    if (name === "get_audit_feedback") return { content: [{ type: "text", text: await readText(files.feedback) }] };
    if (name === "submit_implementation_report") {
      const parsed = ReportSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) return { isError: true, content: [{ type: "text", text: "Invalid report: " + parsed.error.message }] };
      const report = parsed.data;
      const task = await readText(files.task);
      const taskId = task.match(/^# Task (PP-[0-9]+)/m)?.[1];
      if (!taskId || report.task_id !== taskId) return { isError: true, content: [{ type: "text", text: "Report task_id does not match the active task." }] };
      await fs.mkdir(REPORTS, { recursive: true });
      const filename = report.task_id + "-iteration-" + report.iteration + ".json";
      const target = path.resolve(REPORTS, filename);
      if (!target.startsWith(ROOT + path.sep)) throw new Error("Invalid report path");
      try {
        await fs.writeFile(target, JSON.stringify({ ...report, submitted_at: new Date().toISOString() }, null, 2) + "\n", { flag: "wx" });
      } catch (error) {
        if (error.code === "EEXIST") return { isError: true, content: [{ type: "text", text: "This iteration report already exists. Use the next iteration number; reports are append-only." }] };
        throw error;
      }
      return { content: [{ type: "text", text: "Report appended: .procurepilot-control/reports/" + filename + ". Task acceptance remains controlled by the auditor/developer." }] };
    }
    return { isError: true, content: [{ type: "text", text: "Unknown tool: " + name }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Unexpected control server error" }] };
  }
});

await server.connect(new StdioServerTransport());

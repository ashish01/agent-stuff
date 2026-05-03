import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { StringEnum } from "@mariozechner/pi-ai";
import type { Message } from "@mariozechner/pi-ai";
import { type ExtensionAPI, withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "typebox";
import {
  addAssistantUsage,
  buildPiArgs,
  buildSubagentSystemPrompt,
  createEmptyUsage,
  formatUsageStats,
  getPiInvocation,
  summarizeAssistantText,
} from "./core.mjs";

// ---------------------------------------------------------------------------
// Accumulated sub-agent cost tracking (module-level, per-session)
// ---------------------------------------------------------------------------

interface AccumulatedCosts {
  totalCost: number;
  totalInput: number;
  totalOutput: number;
  taskCount: number;
}

function createAccumulatedCosts(): AccumulatedCosts {
  return { totalCost: 0, totalInput: 0, totalOutput: 0, taskCount: 0 };
}

let accumulated = createAccumulatedCosts();

function formatAccumulatedCosts(acc: AccumulatedCosts): string {
  const parts: string[] = [];
  parts.push(`${acc.taskCount} task${acc.taskCount === 1 ? "" : "s"}`);
  if (acc.totalInput) parts.push(`↑${formatTokensShort(acc.totalInput)}`);
  if (acc.totalOutput) parts.push(`↓${formatTokensShort(acc.totalOutput)}`);
  if (acc.totalCost) parts.push(`$${acc.totalCost.toFixed(4)}`);
  return `🔄 sub-agents: ${parts.join(" ")}`;
}

function formatTokensShort(count: number): string {
  if (!count) return "0";
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}

const STATUS_KEY = "task-cost";

// ---------------------------------------------------------------------------

const TaskParams = Type.Object({
  description: Type.String({ description: "Short display description of the delegated task" }),
  prompt: Type.String({ description: "Complete task prompt for the fresh subagent context" }),
  cwd: Type.Optional(Type.String({ description: "Working directory for the subagent. Defaults to current cwd." })),
  model: Type.Optional(Type.String({ description: "Optional Pi model pattern for the subagent" })),
  tools: Type.Optional(Type.Array(Type.String(), { description: "Optional Pi tool allowlist for the subagent" })),
  readOnly: Type.Optional(Type.Boolean({ description: "Use read-only-ish tools: read, grep, find, ls, bash. Default false." })),
  timeoutMs: Type.Optional(Type.Number({ description: "Optional timeout in milliseconds" })),
});

type UsageStats = ReturnType<typeof createEmptyUsage>;

interface TaskDetails {
  description: string;
  prompt: string;
  cwd: string;
  exitCode: number | null;
  stderr: string;
  messages: Message[];
  usage: UsageStats;
  model?: string;
  stopReason?: string;
  errorMessage?: string;
}

async function writeSystemPromptTempFile(): Promise<{ dir: string; filePath: string }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-task-"));
  const filePath = path.join(tmpDir, "system.md");
  await withFileMutationQueue(filePath, async () => {
    await fs.promises.writeFile(filePath, buildSubagentSystemPrompt(), { encoding: "utf-8", mode: 0o600 });
  });
  return { dir: tmpDir, filePath };
}

function cleanupTemp(dir: string | null, filePath: string | null) {
  if (filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  }
  if (dir) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // ignore cleanup errors
    }
  }
}

export default function (pi: ExtensionAPI) {
  // Reset accumulated cost tracking on every fresh session start.
  pi.on("session_start", () => {
    accumulated = createAccumulatedCosts();
  });

  pi.registerTool({
    name: "task",
    label: "Task",
    description:
      "Delegate a focused task to a fresh isolated Pi subagent. Use this when instructions mention Task, subagent, dispatching an agent, or spawning an agent.",
    promptSnippet: "Delegate a focused task to a fresh isolated Pi subagent and return its report",
    promptGuidelines: [
      "Use task when instructions mention Task, subagent, dispatching an agent, spawning an agent, or fresh-context investigation.",
      "When using task, provide a complete prompt because the subagent does not inherit the main conversation.",
      "Use task with readOnly=true for investigation, review, and spec-compliance checks unless file edits are explicitly required.",
    ],
    parameters: TaskParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const taskCwd = params.cwd ?? ctx.cwd;
      const current: TaskDetails = {
        description: params.description,
        prompt: params.prompt,
        cwd: taskCwd,
        exitCode: null,
        stderr: "",
        messages: [],
        usage: createEmptyUsage(),
        model: params.model,
      };

      const emitUpdate = () => {
        onUpdate?.({
          content: [{ type: "text", text: summarizeAssistantText(current.messages) || "(task running...)" }],
          details: { ...current },
        });
      };

      let tmpDir: string | null = null;
      let tmpPromptPath: string | null = null;
      let timeout: NodeJS.Timeout | undefined;
      let wasAborted = false;
      let timedOut = false;

      try {
        const tmp = await writeSystemPromptTempFile();
        tmpDir = tmp.dir;
        tmpPromptPath = tmp.filePath;

        const args = buildPiArgs({
          prompt: params.prompt,
          systemPromptPath: tmpPromptPath,
          model: params.model,
          tools: params.tools,
          readOnly: params.readOnly ?? false,
        });

        const exitCode = await new Promise<number>((resolve) => {
          const invocation = getPiInvocation(args);
          const proc = spawn(invocation.command, invocation.args, {
            cwd: taskCwd,
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
          });

          let buffer = "";

          const killProc = () => {
            wasAborted = true;
            proc.kill("SIGTERM");
            setTimeout(() => {
              if (!proc.killed) proc.kill("SIGKILL");
            }, 5000).unref?.();
          };

          const processLine = (line: string) => {
            if (!line.trim()) return;
            let event: any;
            try {
              event = JSON.parse(line);
            } catch {
              return;
            }

            if (event.type === "message_end" && event.message) {
              const msg = event.message as Message;
              current.messages.push(msg);
              if (msg.role === "assistant") {
                addAssistantUsage(current.usage, msg);
                current.model = current.model ?? msg.model;
                current.stopReason = msg.stopReason;
                current.errorMessage = msg.errorMessage;
              }
              emitUpdate();
            }
          };

          proc.stdout.on("data", (data) => {
            buffer += data.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) processLine(line);
          });

          proc.stderr.on("data", (data) => {
            current.stderr += data.toString();
          });

          proc.on("close", (code) => {
            if (timeout) clearTimeout(timeout);
            if (buffer.trim()) processLine(buffer);
            resolve(code ?? 0);
          });

          proc.on("error", (error) => {
            current.stderr += error.message;
            resolve(1);
          });

          if (signal) {
            if (signal.aborted) killProc();
            else signal.addEventListener("abort", killProc, { once: true });
          }

          if (params.timeoutMs && params.timeoutMs > 0) {
            timeout = setTimeout(() => {
              timedOut = true;
              killProc();
            }, params.timeoutMs);
          }
        });

        current.exitCode = exitCode;

        // --- accumulate sub-agent costs and update the status bar ---
        const taskCost = current.usage.cost;
        accumulated.totalCost += taskCost;
        accumulated.totalInput += current.usage.input;
        accumulated.totalOutput += current.usage.output;
        accumulated.taskCount += 1;
        ctx.ui.setStatus(STATUS_KEY, formatAccumulatedCosts(accumulated));

        if (timedOut) throw new Error(`Task timed out after ${params.timeoutMs}ms`);
        if (wasAborted) throw new Error("Task was aborted");
        if (exitCode !== 0) {
          throw new Error(current.stderr || `Task subprocess exited with code ${exitCode}`);
        }
        if (current.stopReason === "error" || current.stopReason === "aborted") {
          throw new Error(current.errorMessage || `Task ended with stopReason=${current.stopReason}`);
        }

        const summary = summarizeAssistantText(current.messages) || "(task completed with no output)";
        const costNote = taskCost
          ? `\n\n---\n💵 **Sub-agent cost for this task:** $${taskCost.toFixed(
              4,
            )} | **Total sub-agent spend this session:** $${accumulated.totalCost.toFixed(4)} (${accumulated.taskCount} task${accumulated.taskCount === 1 ? "" : "s"})`
          : "";
        return {
          content: [{ type: "text", text: summary + costNote }],
          details: { ...current },
        };
      } finally {
        if (timeout) clearTimeout(timeout);
        cleanupTemp(tmpDir, tmpPromptPath);
      }
    },

    renderCall(args, theme) {
      const description = args.description || "delegated task";
      const mode = args.readOnly ? "read-only" : "full tools";
      return new Text(
        `${theme.fg("toolTitle", theme.bold("task "))}${theme.fg("accent", description)} ${theme.fg("muted", `[${mode}]`)}`,
        0,
        0,
      );
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as TaskDetails | undefined;
      const textPart = result.content.find((part) => part.type === "text") as { type: "text"; text: string } | undefined;
      const output = textPart?.text ?? "(no output)";

      if (!details) return new Text(output, 0, 0);

      const status = details.exitCode === null ? theme.fg("warning", "⏳") : theme.fg("success", "✓");
      const usage = formatUsageStats(details.usage, details.model);
      let text = `${status} ${theme.fg("toolTitle", theme.bold("task"))} ${theme.fg("accent", details.description)}`;
      if (usage) text += `\n${theme.fg("dim", usage)}`;
      // Show running total of all sub-agent spending for this session.
      if (accumulated.taskCount > 0) {
        text += `\n${theme.fg("muted", `🔄 total sub-agent spend: $${accumulated.totalCost.toFixed(4)} (${accumulated.taskCount} task${accumulated.taskCount === 1 ? "" : "s"})`)}`;
      }
      text += `\n${theme.fg("toolOutput", expanded ? output : output.split("\n").slice(0, 8).join("\n"))}`;
      if (!expanded && output.split("\n").length > 8) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
      if (expanded && details.stderr) text += `\n\n${theme.fg("muted", "stderr:")}\n${theme.fg("dim", details.stderr.trim())}`;
      return new Text(text, 0, 0);
    },
  });
}

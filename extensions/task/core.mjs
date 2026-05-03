import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const READ_ONLY_TOOLS = ["read", "grep", "find", "ls", "bash"];

export function buildSubagentSystemPrompt() {
  return `You are a delegated subagent running in a fresh isolated context.

Complete only the delegated task from the main agent.
Do not assume access to the main conversation.
Use the available tools as needed, but stay within the delegated scope.
If readOnly is requested or your task is investigative/review-oriented, do not modify files.
If you modify files, keep changes focused and report exact paths.

Return a concise report with these sections:

## Result
What you found or completed.

## Relevant Files
- \`path/to/file\` - why it matters or what changed

## Commands Run
- \`command\` - outcome

## Issues / Blockers
Anything that prevented completion, or \"None\".

## Recommended Next Steps
What the main agent should do next.`;
}

export function buildPiArgs({ prompt, systemPromptPath, model, tools, readOnly = false }) {
  if (!prompt || typeof prompt !== "string") throw new Error("prompt is required");
  if (!systemPromptPath || typeof systemPromptPath !== "string") throw new Error("systemPromptPath is required");

  const args = ["--mode", "json", "-p", "--no-session"];
  if (model) args.push("--model", model);

  const selectedTools = readOnly ? READ_ONLY_TOOLS : tools;
  if (selectedTools && selectedTools.length > 0) {
    args.push("--tools", selectedTools.join(","));
  }

  args.push("--append-system-prompt", systemPromptPath);
  args.push(`Task: ${prompt}`);
  return args;
}

export function summarizeAssistantText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "assistant" || !Array.isArray(msg.content)) continue;
    for (const part of msg.content) {
      if (part?.type === "text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

export function createEmptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
    contextTokens: 0,
    turns: 0,
  };
}

export function addAssistantUsage(usage, message) {
  if (message?.role !== "assistant") return;
  usage.turns += 1;
  const messageUsage = message.usage;
  if (!messageUsage) return;
  usage.input += messageUsage.input || 0;
  usage.output += messageUsage.output || 0;
  usage.cacheRead += messageUsage.cacheRead || 0;
  usage.cacheWrite += messageUsage.cacheWrite || 0;
  usage.cost += messageUsage.cost?.total || 0;
  usage.contextTokens = messageUsage.totalTokens || usage.contextTokens;
}

export function formatTokens(count) {
  if (!count) return "0";
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}

export function formatUsageStats(usage, model) {
  const parts = [];
  if (usage.turns) parts.push(`${usage.turns} turn${usage.turns === 1 ? "" : "s"}`);
  if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
  if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
  if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
  if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
  if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`);
  if (usage.contextTokens) parts.push(`ctx:${formatTokens(usage.contextTokens)}`);
  if (model) parts.push(model);
  return parts.join(" ");
}

export function getPiInvocation(args, currentScript = process.argv[1], execPath = process.execPath, existsSync = fs.existsSync) {
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && existsSync(currentScript)) {
    return { command: execPath, args: [currentScript, ...args] };
  }

  const execName = path.basename(execPath).toLowerCase();
  const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
  if (!isGenericRuntime) return { command: execPath, args };

  return { command: "pi", args };
}

export function shortenPath(filePath) {
  if (!filePath) return filePath;
  const home = os.homedir();
  return filePath.startsWith(home) ? `~${filePath.slice(home.length)}` : filePath;
}

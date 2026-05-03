import assert from "node:assert/strict";
import {
  buildSubagentSystemPrompt,
  buildPiArgs,
  summarizeAssistantText,
} from "./core.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("system prompt is generic and fresh-context, not personality-based", () => {
  const prompt = buildSubagentSystemPrompt();

  assert.match(prompt, /fresh isolated context/i);
  assert.match(prompt, /Do not assume access to the main conversation/i);
  assert.match(prompt, /Complete only the delegated task/i);
  assert.match(prompt, /Result/i);
  assert.doesNotMatch(prompt, /scout|planner|reviewer|worker/i);
});

test("buildPiArgs creates an isolated JSON-mode print invocation", () => {
  const args = buildPiArgs({
    prompt: "Investigate auth failures",
    systemPromptPath: "/tmp/task-system.md",
  });

  assert.deepEqual(args, [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--append-system-prompt",
    "/tmp/task-system.md",
    "Task: Investigate auth failures",
  ]);
});

test("buildPiArgs supports model and custom tools", () => {
  const args = buildPiArgs({
    prompt: "Review diff",
    systemPromptPath: "/tmp/task-system.md",
    model: "claude-sonnet-4-5",
    tools: ["read", "grep", "find", "ls"],
  });

  assert.deepEqual(args, [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--model",
    "claude-sonnet-4-5",
    "--tools",
    "read,grep,find,ls",
    "--append-system-prompt",
    "/tmp/task-system.md",
    "Task: Review diff",
  ]);
});

test("readOnly uses read-only tool set with bash for read-only commands", () => {
  const args = buildPiArgs({
    prompt: "Inspect logs",
    systemPromptPath: "/tmp/task-system.md",
    readOnly: true,
    tools: ["write"],
  });

  assert.ok(args.includes("--tools"));
  assert.equal(args[args.indexOf("--tools") + 1], "read,grep,find,ls,bash");
});

test("summarizeAssistantText returns last assistant text", () => {
  const messages = [
    { role: "assistant", content: [{ type: "text", text: "first" }] },
    { role: "toolResult", content: [{ type: "text", text: "ignored" }] },
    { role: "assistant", content: [{ type: "text", text: "final" }] },
  ];

  assert.equal(summarizeAssistantText(messages), "final");
});

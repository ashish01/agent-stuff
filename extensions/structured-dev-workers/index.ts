/**
 * Structured Dev Workers
 *
 * Supervised worker-per-task execution for the structured-dev skill.
 * Spawns child pi processes in JSON mode and mirrors their events into the
 * orchestrator tool row for live visibility.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { appendFileSync, existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme, truncateTail, withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "typebox";

const EXTENSION_NAME = "structured-dev-workers";
const RUNS_DIR = path.join(".pi", "structured-dev", "runs");
const SESSIONS_DIR = path.join(".pi", "structured-dev", "sessions");
const MAX_PREVIEW_CHARS = 1200;

type RunMode = "next" | "remaining";
type WorkerStatus = "running" | "completed" | "blocked" | "failed" | "no_pending";
type WorkerSentinelStatus = "COMPLETED" | "BLOCKED" | "FAILED";

interface TaskInfo {
	id: string;
	number: number;
	title: string;
	status: string;
	start: number;
	end: number;
	section: string;
}

interface ToolTrace {
	id: string;
	name: string;
	args: Record<string, unknown>;
	status: "running" | "completed" | "failed";
	preview?: string;
}

interface WorkerTrace {
	taskId: string;
	taskNumber: number;
	taskTitle: string;
	status: WorkerStatus;
	messagePreview: string;
	turns: number;
	tools: ToolTrace[];
	startedAt: number;
	endedAt?: number;
	runDir: string;
	promptPath: string;
	eventsPath: string;
	stderrPath: string;
	finalPath: string;
	summary?: string;
	reason?: string;
	exitCode?: number | null;
}

interface RunDetails {
	mode: RunMode;
	planPath: string;
	tasksPath: string;
	runDir: string;
	status: WorkerStatus;
	totalTasks: number;
	completedBefore: number;
	completedThisRun: number;
	remaining: number;
	current?: WorkerTrace;
	workers: WorkerTrace[];
	logs: string[];
}

const RunStructuredTasksParams = Type.Object({
	planPath: Type.Optional(Type.String({ description: "Path to PLAN.md (default: PLAN.md)" })),
	tasksPath: Type.Optional(Type.String({ description: "Path to TASKS.md (default: TASKS.md)" })),
	mode: Type.Optional(
		StringEnum(["next", "remaining"] as const, {
			description: "Run only the next pending task or all remaining pending tasks (default: remaining)",
			default: "remaining",
		}),
	),
	maxTasks: Type.Optional(Type.Number({ description: "Maximum tasks to execute in this run" })),
	model: Type.Optional(Type.String({ description: "Optional model pattern for child pi workers" })),
});

function relOrAbs(cwd: string, filePath: string): string {
	return path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
}

function shortPath(cwd: string, filePath: string): string {
	const rel = path.relative(cwd, filePath);
	return rel.startsWith("..") ? filePath : rel || ".";
}

function formatTimestamp(date = new Date()): string {
	return date.toISOString().replace(/[:.]/g, "-");
}

function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			if (part && typeof part === "object" && "type" in part && (part as { type: unknown }).type === "text") {
				return String((part as { text?: unknown }).text ?? "");
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function contentText(result: unknown): string {
	if (!result || typeof result !== "object") return "";
	return textFromContent((result as { content?: unknown }).content);
}

function truncatePreview(text: string, maxChars = MAX_PREVIEW_CHARS): string {
	const clean = stripAnsi(text).trim();
	if (clean.length <= maxChars) return clean;
	return `${clean.slice(0, maxChars)}…`;
}

function parseTasks(markdown: string): TaskInfo[] {
	const headerRegex = /^###\s+Task\s+(\d+)\s*:\s*(.+)$/gm;
	const matches = Array.from(markdown.matchAll(headerRegex));
	const tasks: TaskInfo[] = [];

	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];
		const start = match.index ?? 0;
		const end = i + 1 < matches.length ? matches[i + 1].index ?? markdown.length : markdown.length;
		const section = markdown.slice(start, end);
		const number = Number(match[1]);
		const title = match[2].trim();
		const statusMatch = section.match(/^- \*\*Status:\*\*\s*(.+)$/m);
		const status = statusMatch?.[1]?.trim() ?? "";
		tasks.push({ id: `task-${String(number).padStart(3, "0")}`, number, title, status, start, end, section });
	}
	return tasks;
}

function isPending(task: TaskInfo): boolean {
	return /☐\s*Pending/i.test(task.status) || /^pending$/i.test(task.status);
}

function isCompleted(task: TaskInfo): boolean {
	return /☑\s*Completed/i.test(task.status) || /^completed$/i.test(task.status);
}

function replaceTaskSection(markdown: string, task: TaskInfo, nextSection: string): string {
	return markdown.slice(0, task.start) + nextSection + markdown.slice(task.end);
}

function replaceStatus(section: string, status: string): string {
	if (/^- \*\*Status:\*\*\s*.+$/m.test(section)) {
		return section.replace(/^- \*\*Status:\*\*\s*.+$/m, `- **Status:** ${status}`);
	}
	return section.replace(/^(###\s+Task\s+\d+\s*:.+)$/m, `$1\n\n- **Status:** ${status}`);
}

function upsertNote(section: string, label: string, note: string): string {
	const sanitized = note.replace(/\s+/g, " ").trim();
	const line = `- **${label}:** ${sanitized || "No details provided"}`;
	const regex = new RegExp(`^- \\*\\*${label}:\\*\\* .+$`, "m");
	if (regex.test(section)) return section.replace(regex, line);
	const statusLine = section.match(/^- \*\*Status:\*\*.*$/m);
	if (statusLine?.index !== undefined) {
		const insertAt = statusLine.index + statusLine[0].length;
		return section.slice(0, insertAt) + `\n${line}` + section.slice(insertAt);
	}
	return `${section.trimEnd()}\n${line}\n`;
}

function updateProgress(markdown: string): string {
	const tasks = parseTasks(markdown);
	const total = tasks.length;
	const completed = tasks.filter(isCompleted).length;
	const remaining = total - completed;
	let next = markdown;
	if (/^- Total:\s*.*$/m.test(next)) next = next.replace(/^- Total:\s*.*$/m, `- Total: ${total} tasks`);
	if (/^- Completed:\s*.*$/m.test(next)) next = next.replace(/^- Completed:\s*.*$/m, `- Completed: ${completed}`);
	if (/^- Remaining:\s*.*$/m.test(next)) next = next.replace(/^- Remaining:\s*.*$/m, `- Remaining: ${remaining}`);
	return next;
}

async function updateTaskStatus(
	tasksPath: string,
	taskNumber: number,
	status: string,
	noteLabel?: string,
	note?: string,
): Promise<void> {
	await withFileMutationQueue(tasksPath, async () => {
		const current = await fs.readFile(tasksPath, "utf8");
		const tasks = parseTasks(current);
		const task = tasks.find((t) => t.number === taskNumber);
		if (!task) throw new Error(`Task ${taskNumber} not found in ${tasksPath}`);
		let section = replaceStatus(task.section, status);
		if (noteLabel && note) section = upsertNote(section, noteLabel, note);
		const next = updateProgress(replaceTaskSection(current, task, section));
		await fs.writeFile(tasksPath, next, "utf8");
	});
}

function buildWorkerPrompt(plan: string, task: TaskInfo, completedTasks: TaskInfo[], tasksPathDisplay: string): string {
	const completedContext = completedTasks.length
		? completedTasks.map((t) => `- Task ${t.number}: ${t.title}`).join("\n")
		: "- None";

	return `You are a stateless structured-dev task worker running under a supervising orchestrator.\n\nContext rules:\n- The supervising session has already completed planning and approvals.\n- Do not ask the user questions. If required information is missing, report BLOCKED.\n- Execute exactly one task: ${task.id} / Task ${task.number}.\n- Do not start any other pending task.\n- Keep edits minimal and precise.\n- Run relevant verification for this task when practical.\n- Do not update ${tasksPathDisplay}; the orchestrator updates task status after you finish.\n\nFinal response protocol:\n- End your final assistant response with exactly one sentinel line:\n  STRUCTURED_TASK_RESULT:COMPLETED:${task.id}\n  STRUCTURED_TASK_RESULT:BLOCKED:${task.id}:<brief reason>\n  STRUCTURED_TASK_RESULT:FAILED:${task.id}:<brief reason>\n- Before the sentinel, include a concise summary and verification evidence.\n- If blocked by ambiguity, missing credentials, external action, or invalid assumptions, use BLOCKED.\n\n# Plan\n\n${plan}\n\n# Completed Tasks\n\n${completedContext}\n\n# Task To Execute\n\n${task.section.trim()}\n`;
}

function parseSentinel(text: string): { status: WorkerSentinelStatus; taskId: string; reason?: string } | undefined {
	const lines = text.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	for (let i = lines.length - 1; i >= 0; i--) {
		const match = lines[i].match(/^STRUCTURED_TASK_RESULT:(COMPLETED|BLOCKED|FAILED):([^:\s]+)(?::(.+))?$/);
		if (match) {
			return {
				status: match[1] as WorkerSentinelStatus,
				taskId: match[2],
				reason: match[3]?.trim(),
			};
		}
	}
	return undefined;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) {
		return { command: process.execPath, args };
	}

	return { command: "pi", args };
}

function summarizeToolArgs(name: string, args: Record<string, unknown>): string {
	if (name === "bash") return String(args.command ?? "");
	if (typeof args.path === "string") return args.path;
	if (typeof args.pattern === "string") return args.pattern;
	const raw = JSON.stringify(args);
	return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
}

function makeDetailsText(details: RunDetails): string {
	if (details.status === "no_pending") return "No pending structured-dev tasks.";
	const current = details.current;
	const base = `Structured workers: ${details.completedBefore + details.completedThisRun}/${details.totalTasks} complete`;
	if (!current) return base;
	const tool = [...current.tools].reverse().find((t) => t.status === "running") ?? current.tools[current.tools.length - 1];
	const suffix = tool ? ` · ${tool.name} ${summarizeToolArgs(tool.name, tool.args)}` : "";
	return `${base} · Task ${current.taskNumber}: ${current.taskTitle} · ${current.status}${suffix}`;
}

function emit(update: ((partial: AgentToolResult<RunDetails>) => void) | undefined, details: RunDetails): void {
	update?.({ content: [{ type: "text", text: makeDetailsText(details) }], details });
}

async function runWorker(
	pi: ExtensionAPI,
	cwd: string,
	runDirAbs: string,
	planPathAbs: string,
	tasksPathAbs: string,
	planText: string,
	task: TaskInfo,
	completedTasks: TaskInfo[],
	model: string | undefined,
	signal: AbortSignal | undefined,
	details: RunDetails,
	onUpdate: ((partial: AgentToolResult<RunDetails>) => void) | undefined,
): Promise<WorkerTrace> {
	const taskDir = path.join(runDirAbs, `task-${String(task.number).padStart(3, "0")}`);
	await fs.mkdir(taskDir, { recursive: true });
	const promptPath = path.join(taskDir, "prompt.md");
	const eventsPath = path.join(taskDir, "events.jsonl");
	const stderrPath = path.join(taskDir, "stderr.log");
	const finalPath = path.join(taskDir, "final.md");
	const prompt = buildWorkerPrompt(planText, task, completedTasks, shortPath(cwd, tasksPathAbs));
	await fs.writeFile(promptPath, prompt, "utf8");

	const trace: WorkerTrace = {
		taskId: task.id,
		taskNumber: task.number,
		taskTitle: task.title,
		status: "running",
		messagePreview: "",
		turns: 0,
		tools: [],
		startedAt: Date.now(),
		runDir: shortPath(cwd, taskDir),
		promptPath: shortPath(cwd, promptPath),
		eventsPath: shortPath(cwd, eventsPath),
		stderrPath: shortPath(cwd, stderrPath),
		finalPath: shortPath(cwd, finalPath),
	};
	details.current = trace;
	details.workers.push(trace);
	emit(onUpdate, details);

	const args = [
		"--mode",
		"json",
		"--no-skills",
		"--no-prompt-templates",
		"--no-extensions",
		"--session-dir",
		path.join(cwd, SESSIONS_DIR),
		"-p",
		`@${promptPath}`,
	];
	if (model?.trim()) args.splice(0, 0, "--model", model.trim());

	const invocation = getPiInvocation(args);
	let proc: ChildProcessWithoutNullStreams | undefined;
	let stdoutBuffer = "";
	let stderr = "";
	let finalAssistantText = "";
	const processLine = (line: string) => {
		if (!line.trim()) return;
		appendFileSync(eventsPath, `${line}\n`, "utf8");
		let event: any;
		try {
			event = JSON.parse(line);
		} catch {
			return;
		}

		if (event.type === "message_update") {
			const delta = event.assistantMessageEvent;
			if (delta?.type === "text_delta") {
				trace.messagePreview = truncatePreview(`${trace.messagePreview}${String(delta.delta ?? "")}`);
				emit(onUpdate, details);
			}
		}

		if (event.type === "message_end" && event.message?.role === "assistant") {
			finalAssistantText = textFromContent(event.message.content) || finalAssistantText;
			trace.messagePreview = truncatePreview(finalAssistantText);
			emit(onUpdate, details);
		}

		if (event.type === "tool_execution_start") {
			trace.tools.push({
				id: String(event.toolCallId),
				name: String(event.toolName),
				args: (event.args ?? {}) as Record<string, unknown>,
				status: "running",
			});
			emit(onUpdate, details);
		}

		if (event.type === "tool_execution_update") {
			const tool = trace.tools.find((t) => t.id === String(event.toolCallId));
			if (tool) tool.preview = truncatePreview(contentText(event.partialResult), 800);
			emit(onUpdate, details);
		}

		if (event.type === "tool_execution_end") {
			const tool = trace.tools.find((t) => t.id === String(event.toolCallId));
			if (tool) {
				tool.status = event.isError ? "failed" : "completed";
				tool.preview = truncatePreview(contentText(event.result), 800) || tool.preview;
			}
			emit(onUpdate, details);
		}

		if (event.type === "turn_end") {
			trace.turns += 1;
			emit(onUpdate, details);
		}

		if (event.type === "agent_end" && Array.isArray(event.messages)) {
			const assistantMessages = event.messages.filter((m: any) => m?.role === "assistant");
			const last = assistantMessages[assistantMessages.length - 1];
			if (last) finalAssistantText = textFromContent(last.content) || finalAssistantText;
		}
	};

	try {
		await fs.mkdir(path.join(cwd, SESSIONS_DIR), { recursive: true });
		proc = spawn(invocation.command, invocation.args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });

		proc.stdout.on("data", (chunk) => {
			stdoutBuffer += chunk.toString();
			const lines = stdoutBuffer.split("\n");
			stdoutBuffer = lines.pop() ?? "";
			for (const line of lines) void processLine(line);
		});

		proc.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		if (signal) {
			const abort = () => {
				if (proc && !proc.killed) {
					proc.kill("SIGTERM");
					setTimeout(() => proc && !proc.killed && proc.kill("SIGKILL"), 5000);
				}
			};
			if (signal.aborted) abort();
			else signal.addEventListener("abort", abort, { once: true });
		}

		trace.exitCode = await new Promise<number | null>((resolve) => {
			proc!.on("close", (code) => resolve(code));
			proc!.on("error", () => resolve(1));
		});

		if (stdoutBuffer.trim()) processLine(stdoutBuffer);
	} finally {
		await fs.writeFile(stderrPath, stderr, "utf8");
	}

	trace.endedAt = Date.now();
	await fs.writeFile(finalPath, finalAssistantText || "(no final assistant text)", "utf8");

	const sentinel = parseSentinel(finalAssistantText);
	if (trace.exitCode !== 0) {
		trace.status = "failed";
		trace.reason = `Worker exited with code ${trace.exitCode}${stderr.trim() ? `: ${stderr.trim().slice(0, 300)}` : ""}`;
	} else if (!sentinel) {
		trace.status = "failed";
		trace.reason = "Worker exited without a valid STRUCTURED_TASK_RESULT sentinel";
	} else if (sentinel.taskId !== task.id) {
		trace.status = "failed";
		trace.reason = `Worker returned sentinel for ${sentinel.taskId}, expected ${task.id}`;
	} else if (sentinel.status === "COMPLETED") {
		trace.status = "completed";
		trace.summary = truncatePreview(finalAssistantText.replace(/^STRUCTURED_TASK_RESULT:.+$/m, ""), 600);
	} else if (sentinel.status === "BLOCKED") {
		trace.status = "blocked";
		trace.reason = sentinel.reason || "Worker reported blocked";
	} else {
		trace.status = "failed";
		trace.reason = sentinel.reason || "Worker reported failed";
	}

	details.current = trace;
	emit(onUpdate, details);
	void pi; // keep ExtensionAPI available for future orchestration hooks without changing signature
	return trace;
}

export default function structuredDevWorkers(pi: ExtensionAPI) {
	pi.registerTool({
		name: "run_structured_tasks",
		label: "Structured Dev Workers",
		description:
			"Run approved structured-dev TASKS.md tasks with supervised worker-per-task child pi sessions. Streams child JSON events into the orchestrator UI and writes logs under .pi/structured-dev/runs.",
		promptSnippet: "Run approved structured-dev TASKS.md tasks with supervised worker-per-task execution and live progress mirroring.",
		promptGuidelines: [
			"Use run_structured_tasks only after structured-dev PLAN.md/TASKS.md tasks have been approved and the user explicitly chose worker mode.",
			"Do not use run_structured_tasks for Level 0 work; Level 1 work must be promoted to file artifacts before worker mode.",
		],
		parameters: RunStructuredTasksParams,

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const mode: RunMode = params.mode ?? "remaining";
			const planPath = relOrAbs(ctx.cwd, params.planPath ?? "PLAN.md");
			const tasksPath = relOrAbs(ctx.cwd, params.tasksPath ?? "TASKS.md");
			const runDirAbs = path.join(ctx.cwd, RUNS_DIR, formatTimestamp());
			await fs.mkdir(runDirAbs, { recursive: true });

			const details: RunDetails = {
				mode,
				planPath: shortPath(ctx.cwd, planPath),
				tasksPath: shortPath(ctx.cwd, tasksPath),
				runDir: shortPath(ctx.cwd, runDirAbs),
				status: "running",
				totalTasks: 0,
				completedBefore: 0,
				completedThisRun: 0,
				remaining: 0,
				workers: [],
				logs: [],
			};

			try {
				const [planText, tasksText] = await Promise.all([
					fs.readFile(planPath, "utf8"),
					fs.readFile(tasksPath, "utf8"),
				]);
				let tasks = parseTasks(tasksText);
				details.totalTasks = tasks.length;
				details.completedBefore = tasks.filter(isCompleted).length;
				details.remaining = tasks.filter((t) => !isCompleted(t)).length;
				emit(onUpdate, details);

				const maxTasks = Math.max(1, Math.floor(params.maxTasks ?? (mode === "next" ? 1 : Number.MAX_SAFE_INTEGER)));
				let ran = 0;

				while (ran < maxTasks) {
					const freshTasksText = await fs.readFile(tasksPath, "utf8");
					tasks = parseTasks(freshTasksText);
					const pending = tasks.find(isPending);
					if (!pending) {
						details.status = details.completedThisRun > 0 ? "completed" : "no_pending";
						details.remaining = tasks.filter((t) => !isCompleted(t)).length;
						emit(onUpdate, details);
						break;
					}

					await updateTaskStatus(tasksPath, pending.number, "◐ In Progress", "Worker run", details.runDir);
					const completedContext = tasks.filter((t) => isCompleted(t));
					const trace = await runWorker(
						pi,
						ctx.cwd,
						runDirAbs,
						planPath,
						tasksPath,
						planText,
						pending,
						completedContext,
						params.model,
						signal,
						details,
						onUpdate,
					);
					details.logs.push(trace.runDir);

					if (trace.status === "completed") {
						await updateTaskStatus(tasksPath, pending.number, "☑ Completed", "Completion note", trace.summary ?? "Completed by structured-dev worker");
						details.completedThisRun += 1;
						ran += 1;
						details.remaining = Math.max(0, details.totalTasks - details.completedBefore - details.completedThisRun);
						emit(onUpdate, details);
						if (mode === "next") break;
						continue;
					}

					if (trace.status === "blocked") {
						await updateTaskStatus(tasksPath, pending.number, "☒ Blocked", "Blocker", trace.reason ?? "Worker reported blocked");
						details.status = "blocked";
						emit(onUpdate, details);
						break;
					}

					await updateTaskStatus(tasksPath, pending.number, "☒ Failed", "Failure", trace.reason ?? "Worker failed");
					details.status = "failed";
					emit(onUpdate, details);
					break;
				}

				if (details.status === "running") details.status = "completed";
				const finalTasks = parseTasks(await fs.readFile(tasksPath, "utf8"));
				details.remaining = finalTasks.filter((t) => !isCompleted(t)).length;
				emit(onUpdate, details);
				return { content: [{ type: "text", text: makeDetailsText(details) }], details };
			} catch (error) {
				details.status = "failed";
				const message = error instanceof Error ? error.message : String(error);
				return { content: [{ type: "text", text: `Structured worker run failed: ${message}` }], details, isError: true };
			}
		},

		renderCall(args, theme) {
			const mode = args.mode ?? "remaining";
			const tasksPath = args.tasksPath ?? "TASKS.md";
			let text = theme.fg("toolTitle", theme.bold("structured workers "));
			text += theme.fg("accent", mode);
			text += theme.fg("muted", ` ${tasksPath}`);
			if (args.model) text += theme.fg("dim", ` · ${args.model}`);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			const details = result.details as RunDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
			}

			const icon = details.status === "failed"
				? theme.fg("error", "✗")
				: details.status === "blocked"
					? theme.fg("warning", "■")
					: isPartial || details.status === "running"
						? theme.fg("warning", "⏳")
						: theme.fg("success", "✓");

			const header = `${icon} ${theme.fg("toolTitle", theme.bold("structured workers "))}${theme.fg(
				"accent",
				`${details.completedBefore + details.completedThisRun}/${details.totalTasks}`,
			)}${theme.fg("muted", ` complete · ${details.status}`)}`;

			if (!expanded) {
				let text = header;
				const current = details.current;
				if (current) {
					text += `\n${theme.fg("muted", `Task ${current.taskNumber}: `)}${theme.fg("accent", current.taskTitle)}`;
					const tool = [...current.tools].reverse().find((t) => t.status === "running") ?? current.tools[current.tools.length - 1];
					if (tool) text += `\n${theme.fg("muted", "→ ")}${theme.fg("toolTitle", tool.name)} ${theme.fg("dim", summarizeToolArgs(tool.name, tool.args))}`;
					if (current.reason) text += `\n${theme.fg(current.status === "failed" ? "error" : "warning", current.reason)}`;
				}
				text += `\n${theme.fg("dim", `logs: ${details.runDir} (Ctrl+O to expand)`)}`;
				return new Text(text, 0, 0);
			}

			const container = new Container();
			container.addChild(new Text(header, 0, 0));
			container.addChild(new Text(theme.fg("dim", `plan: ${details.planPath} · tasks: ${details.tasksPath}`), 0, 0));
			container.addChild(new Text(theme.fg("dim", `logs: ${details.runDir}`), 0, 0));

			for (const worker of details.workers) {
				container.addChild(new Spacer(1));
				const workerIcon = worker.status === "completed" ? theme.fg("success", "✓") : worker.status === "running" ? theme.fg("warning", "⏳") : theme.fg("error", "✗");
				container.addChild(new Text(`${workerIcon} ${theme.fg("muted", `Task ${worker.taskNumber}: `)}${theme.fg("accent", worker.taskTitle)} ${theme.fg("dim", worker.status)}`, 0, 0));
				for (const tool of worker.tools) {
					const toolIcon = tool.status === "completed" ? theme.fg("success", "✓") : tool.status === "running" ? theme.fg("warning", "⏳") : theme.fg("error", "✗");
					container.addChild(new Text(`${toolIcon} ${theme.fg("toolTitle", tool.name)} ${theme.fg("dim", summarizeToolArgs(tool.name, tool.args))}`, 0, 0));
					if (tool.preview) container.addChild(new Text(theme.fg("dim", tool.preview.split("\n").slice(-3).join("\n")), 2, 0));
				}
				if (worker.messagePreview) {
					const truncated = truncateTail(worker.messagePreview, { maxLines: 8, maxBytes: 2000 }).content;
					container.addChild(new Spacer(1));
					container.addChild(new Markdown(truncated, 0, 0, getMarkdownTheme()));
				}
				if (worker.reason) container.addChild(new Text(theme.fg(worker.status === "failed" ? "error" : "warning", worker.reason), 0, 0));
				container.addChild(new Text(theme.fg("dim", `events: ${worker.eventsPath}`), 0, 0));
			}

			return container;
		},
	});

	pi.registerCommand("structured-workers", {
		description: "Show structured-dev worker extension status",
		handler: async (_args, ctx) => {
			ctx.ui.notify(`${EXTENSION_NAME} loaded. Use the run_structured_tasks tool after structured-dev task approval.`, "info");
		},
	});
}

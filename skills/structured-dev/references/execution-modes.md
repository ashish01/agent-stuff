# Execution Modes

Use after Level 2 or Level 3 tasks are approved.

## Options

1. **In-session execution** — execute approved `TASKS.md` tasks directly in the parent session.
2. **Task-based subagent execution** — dispatch one approved task at a time to a fresh Pi subagent using the generic `task` tool.

Level 0 never uses subagents. Level 1 uses in-session execution by default; promote to Level 2 first if the user wants subagents.

## In-Session Execution

- Execute approved `TASKS.md` tasks in order.
- Update progress in `TASKS.md` as you go.
- Continue directly into the next task unless blocked.

## Task-Based Subagent Execution

Only use after explicit user approval.

For each pending task:

1. Dispatch one `task` subagent.
2. Include the full `PLAN.md` context.
3. Include relevant completed-task context.
4. Include the exact task section from `TASKS.md`.
5. Instruct the subagent to execute only that task.
6. Wait for the subagent report.
7. Parent session inspects changes, verifies acceptance criteria, and updates `TASKS.md`.
8. Do not dispatch the next task until review and task-status update are complete.

## Task Subagent Prompt Requirements

- Include the full task text and exact acceptance criteria.
- Include relevant plan context and dependencies.
- Tell the subagent whether it may edit files.
  - Implementation tasks use normal write-capable tools.
  - Review/investigation tasks use `readOnly=true`.
- Tell the subagent not to update `TASKS.md`; the parent session updates progress after review.
- Require a concise report with files changed, commands run, verification evidence, and blockers.

## Turn-Continuation Rule

Do **not** end a turn with a standalone status-only message if work can continue.
After finishing a task, continue directly into the next task unless blocked.

Pause only when:

- external action is required
- a spec/plan assumption is invalid
- tasks conflict and need reprioritization
- a dependency is missing with no safe workaround

Do **not** pause for:

- minor implementation choices
- fixable test failures
- normal edge-case handling

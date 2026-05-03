# structured-dev-workers

Pi extension that provides supervised worker-per-task execution for the `structured-dev` skill.

## Tool

`run_structured_tasks`

Use only after `PLAN.md` and `TASKS.md` are approved and the user explicitly chooses worker mode.

Parameters:

- `planPath` — path to `PLAN.md` (default: `PLAN.md`)
- `tasksPath` — path to `TASKS.md` (default: `TASKS.md`)
- `mode` — `next` or `remaining` (default: `remaining`)
- `maxTasks` — optional maximum number of tasks to run
- `model` — optional model pattern for child Pi workers

## Behavior

- Parses `TASKS.md` and selects the next pending task.
- Marks it `◐ In Progress` before dispatch.
- Spawns a child `pi --mode json` process for exactly one task.
- Mirrors child JSON events into the parent tool row with live progress.
- Writes logs under `.pi/structured-dev/runs/<timestamp>/`.
- Marks the task `☑ Completed`, `☒ Blocked`, or `☒ Failed` based on the worker sentinel.
- Stops on blocked or failed tasks.

Workers do not ask questions. Ambiguity or missing external requirements are reported as blocked so the orchestrator session can handle them.

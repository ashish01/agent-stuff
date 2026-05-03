# Level 2 — Medium Change

Use when the outcome is reasonably clear but safe implementation benefits from file artifacts, ordering, resumability, or task tracking.

Choose Level 2 when Level 3 is not required and any are true:

- multiple files/components are involved
- ordering or dependencies matter
- resumability / progress tracking would help
- the work may span more than one focused pass
- risk is moderate even though behavior is mostly understood

## Artifact Strategy

1. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`.
2. Self-review `PLAN.md`, fix issues, then ask for approval and stop.
3. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`.
4. Self-review `TASKS.md`, fix issues, then ask for approval and stop.

## Task Guidelines

- Each task should be completable in one focused effort.
- Order tasks by dependency.
- Include setup tasks when needed.
- Include testing tasks where applicable.
- Final task is always verification/validation.

## Approval Gates

Required approvals:

1. `PLAN.md`
2. `TASKS.md`

If the user requests changes, update the active artifact, summarize the changes, and ask for approval again.

## Execution

After tasks are approved, read `references/execution-modes.md` and offer:

1. In-session execution
2. Task-based subagent execution using the generic `task` tool

Do not start either mode until the user chooses.

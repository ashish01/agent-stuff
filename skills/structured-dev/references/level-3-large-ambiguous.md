# Level 3 — Large or Ambiguous Change

Use when desired behavior is ambiguous, product/UX/scope choices need agreement, architecture or subsystem boundaries may change, migration/high-risk changes are involved, or planning would be irresponsible without a spec first.

## Discovery Before Spec

If the desired outcome, scope, product behavior, or UX is unclear, do lightweight discovery before writing `SPEC.md`:

1. Ask clarifying questions one at a time.
2. Prefer multiple-choice questions when that makes the decision easier for the user.
3. Clarify goals, constraints, success criteria, non-goals, and important tradeoffs.
4. Propose 2-3 plausible approaches with tradeoffs.
5. Recommend one approach and explain why.
6. Ask for approval of the direction before writing `SPEC.md`.

Do not write a spec for ambiguous work until the intended behavior and chosen approach are clear enough to validate.

## Artifact Strategy

1. Complete discovery if ambiguity remains.
2. Write `SPEC.md` using `references/SPEC-TEMPLATE.md`.
3. Self-review `SPEC.md`, fix issues, then ask for approval and stop.
4. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`.
5. Self-review `PLAN.md`, fix issues, then ask for approval and stop.
6. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`.
7. Self-review `TASKS.md`, fix issues, then ask for approval and stop.

## Approval Gates

Required approvals:

1. `SPEC.md`
2. `PLAN.md`
3. `TASKS.md`

If the user requests changes, update the active artifact, summarize the changes, and ask for approval again.

## Execution

After tasks are approved, read `references/execution-modes.md`.

Recommend task-based subagent execution using the generic `task` tool, but still ask before using it. In-session execution remains available if the user prefers it.

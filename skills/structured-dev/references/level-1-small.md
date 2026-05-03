# Level 1 — Small Change

Use when the outcome is clear, risk is low, scope is small, and the work fits in one focused pass, but still involves several steps or choices.

## Artifact Strategy

Create one concise **mini plan + checklist in chat** with:

- Summary
- Current State
- Research Findings
- Approach
- Scope
- Risks & Mitigations
- Ordered checklist
- Acceptance criteria
- Final verification task

Self-review it before presenting:

1. No placeholders, `TBD`, `TODO`, vague instructions, or incomplete sections.
2. Names, files, behavior, scope, and acceptance criteria agree.
3. No unrelated refactoring or unapproved extras.
4. Success can be proven with concrete commands or observable checks.

Ask for approval once and stop.

## Execution

After approval:

- Execute in-session by default.
- Update the in-band checklist as you go.
- Run the final verification task.
- Report verification evidence in chat.

## Subagents

Do not use subagents for Level 1 by default. If the user explicitly wants subagents, promote to Level 2 and create `PLAN.md` / `TASKS.md` first.

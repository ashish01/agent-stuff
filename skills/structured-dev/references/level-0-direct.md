# Level 0 — Direct Execute

Use for mechanical, single-step edits where the outcome is fully specified, scope is tiny, risk is negligible, implementation is obvious, and verification is immediate.

## Workflow

After Phase 3 classification, post a brief declaration in chat:

- what you found
- what you are changing
- how you will verify it

Then implement immediately. No artifact, no task list, no approval gate.

## Execution

- Implement the declared change.
- Run the planned verification.
- Report verification evidence in chat.

## Constraints

- Do not use subagents.
- Do not silently make changes; the declaration is still required.
- If any nontrivial choice appears during implementation, stop and reclassify as Level 1 or higher.

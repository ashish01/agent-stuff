# Verification and Review

Use before claiming work is complete, fixed, passing, or successful.

## Evidence Before Claims

Do not claim work is complete, fixed, passing, or successful until the relevant verification command or observable check has been run in the current session and its output has been read.

Completion claims must include evidence:

- command/check
- pass/fail result
- relevant caveat, if any

## Standard Verification

Run, as applicable:

1. full test suite
2. lint/format checks
3. type checking
4. smoke test of the main functionality

## Level 2 / Level 3 Review Before Final Verification

After implementation and before final verification:

1. Compare changes against `TASKS.md` acceptance criteria.
2. Check for missing requirements, unrelated changes, and unapproved scope creep.
3. Check for obvious code quality, maintainability, and integration risks.
4. Fix critical or important issues before final verification.

If task-based subagent execution was used, do not rely only on subagent success reports. Inspect the resulting changes, verify acceptance criteria, and update `TASKS.md` yourself.

## Reporting

Level 0 / Level 1: provide the verification summary in chat.

Level 2 / Level 3: add a `## Verification` section to `TASKS.md`.

Verification summary fields:

- **Tests:** pass / fail / N/A
- **Lint:** pass / fail / N/A
- **Type check:** pass / fail / N/A
- **Smoke test:** pass / fail with brief note
- **Review:** Level 2/3 only — acceptance-criteria and scope review summary
- **Summary:** 1-2 sentence change summary

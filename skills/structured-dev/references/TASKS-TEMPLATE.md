# Tasks: [Title]

> Generated from PLAN.md by structured-dev skill on [YYYY-MM-DD]

## Progress

- Total: [N] tasks
- Completed: 0
- Remaining: [N]

## Tasks

### Task 1: [Short descriptive title]

- **Status:** ☐ Pending
- **Files:** `path/to/file1`, `path/to/file2`
- **What:** [Exactly what to do — specific enough to implement without guessing]
- **Why:** [How this fits into the overall plan]
- **Acceptance criteria:**
  - [ ] [Specific, verifiable criterion]
  - [ ] [Another criterion]
- **Verification:**
  - Command/check: `[exact command or observable check]`
  - Expected result: [specific expected output/result]

### Task 2: [Short descriptive title]

- **Status:** ☐ Pending
- **Files:** `path/to/file1`
- **What:** [Exactly what to do]
- **Why:** [How this fits into the overall plan]
- **Depends on:** Task 1
- **Acceptance criteria:**
  - [ ] [Specific, verifiable criterion]
- **Verification:**
  - Command/check: `[exact command or observable check]`
  - Expected result: [specific expected output/result]

<!-- Repeat for all tasks -->

## Task Writing Rules

Before approval, replace all placeholders. Do not leave `TBD`, `TODO`, “handle edge cases”, “write tests”, “implement validation”, “similar to above”, or vague instructions.

Each task must include:
- exact file paths
- specific implementation instructions
- specific acceptance criteria
- exact verification command(s) or observable check(s)
- expected result for each verification check

A fresh task subagent should be able to execute the task without guessing.

<!-- Added after Phase 6 -->
## Verification

- **Tests:** [pass/fail/N/A — command run]
- **Lint:** [pass/fail/N/A — command run]
- **Type check:** [pass/fail/N/A — command run]
- **Smoke test:** [pass/fail — command or observable check]
- **Review:** [Level 2/3 only — summary of acceptance-criteria and scope review]
- **Summary:** [1-2 sentence summary of all changes made]

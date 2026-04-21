---
name: structured-dev
description: >
  Structured software development workflow for any request that will or could modify files on disk,
  regardless of size. This includes explicit change requests AND requests phrased as questions or
  suggestions that imply a desired change — e.g. "can we use X instead?", "why not use Y?",
  "should this be refactored?", "can this be memory-mapped?", "is there a better way to do Z?".
  If the honest answer to the question involves editing code, treat it as a change request and use
  this skill. Covers new code, features, fixes, refactors, configuration changes, scaffolding, and
  greenfield builds. Always think before coding, then choose the appropriate rigor level: direct
  execute for trivial low-risk changes, in-band mini plan/tasks for small changes, file-based plan/
  tasks for medium changes, and spec + plan + tasks for large or ambiguous changes.
---

# Structured Development Workflow

A disciplined, scalable workflow for software changes.

## Core Principle

**Thinking is always mandatory. Artifacts are conditional.**

For any change that could modify files:
1. Understand the current state
2. Decide what should change
3. Assess ambiguity, risk, and implementation complexity
4. Decide how success will be verified
5. Choose the lightest rigor level that is still safe

## Use / Do Not Use

Use this skill whenever the request will or could result in changing repository files.

Do **not** use it for:
- pure read-only exploration
- explaining existing code with no implementation intent
- architecture discussion where the user explicitly does not want changes yet
- brainstorming framed as "just thinking out loud"

## Rigor Levels

- **Level 0 — Direct Execute:** trivial, unambiguous, low-risk change; declare change + verification, then do it.
- **Level 1 — Small Change:** small but non-trivial change; mini plan + mini tasks in chat, both approved before implementation.
- **Level 2 — Medium Change:** nontrivial implementation with reasonably clear outcome; write `PLAN.md` and `TASKS.md`.
- **Level 3 — Large or Ambiguous Change:** ambiguous, design-heavy, or high-risk work; write `SPEC.md`, then `PLAN.md`, then `TASKS.md`.

## Workflow Overview

```text
PHASE 1: Analyze → PHASE 2: Research (if needed) → PHASE 3: Think + Classify

Level 0: Declare → Implement → Verify
Level 1: Mini Plan → Approval → Mini Tasks → Approval → Implement → Verify
Level 2: PLAN.md → Approval → TASKS.md → Approval → Implement → Verify
Level 3: SPEC.md → Approval → PLAN.md → Approval → TASKS.md → Approval → Implement → Verify
```

## PHASE 1: Analyze Current State

**Goal:** Understand what exists before proposing a change.

For existing projects:
1. Inspect project structure (`find`, `ls`, `tree`)
2. Read key config files (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Makefile`, etc.)
3. Read README and relevant docs
4. Identify stack, conventions, tests, CI, and related code
5. Check for existing `SPEC.md`, `PLAN.md`, or `TASKS.md`

For greenfield work:
1. Understand the user's environment and constraints
2. Check whether the current directory is empty / in git
3. Read context files such as `AGENTS.md`

**Output:** Briefly summarize findings to the user in 3-5 bullets.

**Companion skill:** If the work includes meaningful frontend/UI implementation, styling, layout, or visual polish, also load `frontend-design`. `structured-dev` remains the primary workflow.

## PHASE 2: Research (Only If Needed)

**Goal:** Verify details when your existing knowledge may be outdated or insufficient.

Ask yourself:
- Am I confident in the current API/syntax?
- Is this technology evolving or recently changed?
- Are there security-sensitive decisions here?
- Is the user asking for a specific integration whose docs matter?

If confidence is high, skip research and say so.

If research is needed:
- Prefer the `playwright-cli` skill for browser-driven research
- Use `browser-tools` if it is a better fit for the situation
- Read `references/research-workflow.md` for the detailed procedure

**Output:** Briefly note what you researched and the key findings.

## PHASE 3: Think + Classify

**Goal:** Decide what should change, how risky it is, and which rigor level is required.

Before choosing a level, explicitly determine:
1. **Current state:** what exists now that matters
2. **Intended outcome:** what will change
3. **Risks / unknowns:** what could go wrong or remains unclear
4. **Verification path:** which checks will prove success
5. **Rigor level:** Level 0, 1, 2, or 3

Tell the user, concisely:
- brief current-state summary
- intended change
- verification approach
- explicit decision line:
  - `Decision: Level 0 (direct execute) because ...`
  - `Decision: Level 1 (in-band mini plan/tasks) because ...`
  - `Decision: Level 2 (PLAN.md + TASKS.md) because ...`
  - `Decision: Level 3 (SPEC.md + PLAN.md + TASKS.md) because ...`

### Classification Rules

Use these two questions in order:
1. **How ambiguous is the desired outcome?** If the main question is *"What should this do?"*, prefer **Level 3**.
2. **How complex is safe implementation?** If the main question is *"How should we build this safely?"*, choose between **Level 1** and **Level 2** based on scope/risk.

Choose **Level 0** only if **all** are true:
- outcome is unambiguous
- scope is tiny
- risk is low
- implementation is obvious
- verification is straightforward

Choose **Level 1** when most are true:
- outcome is clear
- risk is low
- scope is small but involves several steps
- only a small number of files are likely involved
- implementation and verification should fit in one focused pass

Choose **Level 2** when Level 3 is not required and any are true:
- multiple files/components are involved
- ordering or dependencies matter
- resumability / progress tracking would help
- the work may span more than one focused pass
- risk is moderate even though behavior is mostly understood

Choose **Level 3** when any are true:
- desired behavior is ambiguous
- product / UX / scope choices need agreement
- architecture or subsystem boundaries may change
- migration or high-risk changes are involved
- planning would be irresponsible without a spec first

If Level 0 is selected, proceed directly to implementation after the declaration. Otherwise continue to Phase 4.

## PHASE 4: Create Artifacts + Get Approvals

**Goal:** Create only the artifacts needed for the selected level, then stop at the required approval gates.

### Asking Questions

If you need user input that materially changes the work:
- use `questionnaire` if available
- otherwise ask directly in chat

Do **not** ask questions you can answer yourself.

### Level 0

After Phase 3, post a brief declaration in chat:
- what you found
- what you are changing
- how you will verify it

Then implement immediately. No artifact, no task list, no approval gate.

### Level 1

Create a concise **mini plan in chat** with:
- Summary
- Current State
- Research Findings
- Approach
- Scope
- Risks & Mitigations

Then ask for approval and stop.

After plan approval, create **mini tasks in chat** with:
- ordered tasks
- dependencies if any
- acceptance criteria
- a final verification task

Then ask for approval and stop.

### Level 2

1. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`
2. Ask for approval and stop
3. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`
4. Ask for approval and stop

Task guidelines:
- each task should be completable in one focused effort
- order tasks by dependency
- include setup tasks when needed
- include testing tasks where applicable
- final task is always verification/validation

### Level 3

1. Write `SPEC.md` using `references/SPEC-TEMPLATE.md`
2. Ask for approval and stop
3. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`
4. Ask for approval and stop
5. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`
6. Ask for approval and stop

### Approval Gates

**Never skip approval gates.** The user must explicitly approve before you proceed.

Required approvals by level:
- **Level 1:** mini plan approval, then mini tasks approval
- **Level 2:** `PLAN.md` approval, then `TASKS.md` approval
- **Level 3:** `SPEC.md` approval, then `PLAN.md` approval, then `TASKS.md` approval

If the user requests changes:
1. update the active artifact(s)
2. briefly summarize what changed
3. ask for approval again

## PHASE 5: Implement

**Goal:** Execute approved work in the current session.

Execution policy:
1. Determine the active level from Phase 3
2. Implement in this session
3. Do **not** use worker panes or sub-agents for this workflow
4. If the user explicitly asks for multi-agent execution, explain that this workflow is in-session only

Implementation by level:
- **Level 0:** implement the declared change and run the planned verification
- **Level 1:** execute the approved in-band tasks and update the in-band checklist as you go
- **Level 2 / Level 3:** execute the approved `TASKS.md` tasks and update progress in `TASKS.md`

### Turn-Continuation Rule

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

## PHASE 6: Verify

**Goal:** Prove the change actually works.

Run, as applicable:
1. full test suite
2. lint/format checks
3. type checking
4. smoke test of the main functionality

Use fresh verification evidence before making completion claims.

Report results by level:
- **Level 0 / Level 1:** provide the verification summary in chat
- **Level 2 / Level 3:** add a `## Verification` section to `TASKS.md` (see `references/TASKS-TEMPLATE.md`)

Verification summary fields:
- **Tests:** pass / fail / N/A
- **Lint:** pass / fail / N/A
- **Type check:** pass / fail / N/A
- **Smoke test:** pass / fail with brief note
- **Summary:** 1-2 sentence change summary

## Important Rules

1. Never skip Phase 3. Think and classify before writing code.
2. Choose the lightest safe rigor level.
3. **Level 0 is narrow.** Use it only for trivial, unambiguous, low-risk changes.
4. Do not silently make changes. Even Level 0 requires a declaration before implementation.
5. Use the correct artifact strategy for the active level:
   - Level 0 → no artifacts
   - Level 1 → in-band mini plan/tasks
   - Level 2 → `PLAN.md` + `TASKS.md`
   - Level 3 → `SPEC.md` + `PLAN.md` + `TASKS.md`
6. Update task progress in real time for any level that has tasks.
7. If `SPEC.md`, `PLAN.md`, or `TASKS.md` already exist for the active level, read them first and ask whether to continue or start fresh.

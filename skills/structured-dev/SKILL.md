---
name: structured-dev
description: >
  Structured development workflow for any request that will or could modify files. Covers: explicit
  changes; new code, features, fixes, refactors, config, scaffolding, docs, greenfield builds;
  creation requests (framework, system, tool, app, template set, doc structure, experiment workflow);
  and questions/suggestions implying a change — "how can this be done?", "can we use X instead?",
  "why not use Y?", "should this be refactored?", "can this be memory-mapped?", "is there a better
  way?". If the honest answer involves editing code or creating files, treat it as a change request.
  Not for pure read-only, chat-only, or explicitly conceptual-only answers. Always think before
  coding, then choose rigor: direct execute (trivial), mini plan+checklist (small), PLAN.md+TASKS.md
  (medium), or SPEC+PLAN+TASKS (large/ambiguous).
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

## Exit Conditions

Do **not** apply this workflow for:
- pure read-only exploration
- explaining existing code with no implementation intent
- architecture discussion where the user explicitly does not want changes yet
- brainstorming framed as "just thinking out loud" or explicitly requested as chat-only/conceptual

## Rigor Levels

- **Level 0 — Direct Execute:** trivial, unambiguous, low-risk change; declare change + verification, then do it.
- **Level 1 — Small Change:** small but non-trivial change; combined mini plan + checklist in chat, approved once before implementation.
- **Level 2 — Medium Change:** nontrivial implementation with reasonably clear outcome; write `PLAN.md` and `TASKS.md`.
- **Level 3 — Large or Ambiguous Change:** ambiguous, design-heavy, or high-risk work; write `SPEC.md`, then `PLAN.md`, then `TASKS.md`.

## Workflow Overview

```text
PHASE 1: Analyze → PHASE 2: Research (if needed) → PHASE 3: Think + Classify

Level 0: Declare → Implement → Verify
Level 1: Mini Plan + Checklist → Approval → Implement → Verify
Level 2: PLAN.md → Approval → TASKS.md → Approval → Implement → Verify
Level 3: SPEC.md → Approval → PLAN.md → Approval → TASKS.md → Approval → Implement → Verify
```

## PHASE 1: Analyze Current State

**Goal:** Understand what exists before proposing a change.

For existing projects:
1. Inspect project structure (Glob patterns; fall back to `ls`/`tree` if needed)
2. Read key config files (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Makefile`, etc.)
3. Read README and relevant docs
4. Identify stack, conventions, tests, CI, and related code (use Grep for targeted searches)
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
  - `Decision: Level 1 (in-band mini plan + checklist) because ...`
  - `Decision: Level 2 (PLAN.md + TASKS.md) because ...`
  - `Decision: Level 3 (SPEC.md + PLAN.md + TASKS.md) because ...`

### Classification Rules

Use these two questions in order:
1. **How ambiguous is the desired outcome?** If the main question is *"What should this do?"*, prefer **Level 3**.
2. **How complex is safe implementation?** If the main question is *"How should we build this safely?"*, choose between **Level 1** and **Level 2** based on scope/risk.

Choose **Level 0** only for mechanical, single-step edits where **all** are true:
- outcome is fully specified by the user or existing convention
- scope is tiny, usually one file and one localized change
- risk is negligible, not merely low
- implementation is obvious without choosing between approaches
- verification is immediate and straightforward

Do **not** choose Level 0 if any are true:
- the change touches behavior, data, public API, security, persistence, or build/deploy configuration
- more than one implementation approach is plausible
- more than one file/component is likely involved
- tests need to be designed, added, or substantially updated
- rollback/debugging would take more than a few minutes
- the user is asking whether something *should* be changed, not exactly what to change

If there is any doubt between Level 0 and Level 1, choose **Level 1**.

Choose **Level 1** when most are true:
- outcome is clear
- risk is low
- scope is small but involves several steps or choices
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

### Discovery for Ambiguous Level 3 Work

If Level 3 is selected because the desired outcome, scope, product behavior, or UX is unclear, do lightweight discovery before writing `SPEC.md`:

1. Ask clarifying questions one at a time.
2. Prefer multiple-choice questions when that makes the decision easier for the user.
3. Clarify goals, constraints, success criteria, non-goals, and important tradeoffs.
4. Propose 2-3 plausible approaches with tradeoffs.
5. Recommend one approach and explain why.
6. Ask for approval of the direction before writing `SPEC.md`.

Do not write a spec for ambiguous work until the intended behavior and chosen approach are clear enough to validate.

If Level 0 is selected, proceed directly to implementation after the declaration. Otherwise continue to Phase 4.

## PHASE 4: Create Artifacts + Get Approvals

**Goal:** Create only the artifacts needed for the selected level, then stop at the required approval gates.

### Level 0

After Phase 3, post a brief declaration in chat:
- what you found
- what you are changing
- how you will verify it

Then implement immediately. No artifact, no task list, no approval gate.

### Level 1

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

Ask for approval once and stop.

### Level 2

1. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`
2. Self-review the artifact, fix issues, then ask for approval and stop
3. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`
4. Self-review the artifact, fix issues, then ask for approval and stop

Task guidelines:
- each task should be completable in one focused effort
- order tasks by dependency
- include setup tasks when needed
- include testing tasks where applicable
- final task is always verification/validation

### Level 3

1. Complete discovery if ambiguity remains
2. Write `SPEC.md` using `references/SPEC-TEMPLATE.md`
3. Self-review the artifact, fix issues, then ask for approval and stop
4. Write `PLAN.md` using `references/PLAN-TEMPLATE.md`
5. Self-review the artifact, fix issues, then ask for approval and stop
6. Write `TASKS.md` using `references/TASKS-TEMPLATE.md`
7. Self-review the artifact, fix issues, then ask for approval and stop

### Artifact Self-Review

Before asking for approval on any `SPEC.md`, `PLAN.md`, `TASKS.md`, or Level 1 mini plan/checklist, review and fix:

1. **Placeholder scan:** no `TBD`, `TODO`, vague instructions, or incomplete sections.
2. **Consistency check:** names, files, behavior, scope, and acceptance criteria agree.
3. **Scope check:** no unrelated refactoring or unapproved extras.
4. **Verification check:** success can be proven with concrete commands or observable checks.

### Approval Gates

**Never skip approval gates.** The user must explicitly approve before you proceed.

Required approvals by level:
- **Level 1:** mini plan + checklist approval
- **Level 2:** `PLAN.md` approval, then `TASKS.md` approval
- **Level 3:** `SPEC.md` approval, then `PLAN.md` approval, then `TASKS.md` approval

If the user requests changes:
1. update the active artifact(s)
2. briefly summarize what changed
3. ask for approval again

## PHASE 5: Implement

**Goal:** Execute approved work using the lightest safe execution mode.

### Execution Modes

After tasks are approved, choose an execution mode.

- **In-session execution:** default for Level 0 / Level 1 and always available.
- **Supervised task-tool subagent execution:** available only when `PLAN.md` and `TASKS.md` exist and the `run_structured_tasks` extension tool is loaded. This is structured-dev's subagent-driven mode: each approved task runs in a fresh child Pi session while the parent session supervises progress, handles blocked/failed tasks, and performs review/verification.

Task-tool subagent policy:
- **Level 0:** do not use task-tool subagents; direct execute in-session.
- **Level 1:** use in-session execution by default. If the user explicitly wants task-tool subagents, promote to Level 2 and create `PLAN.md` / `TASKS.md` first.
- **Level 2:** offer both options: in-session execution or supervised task-tool subagent execution with `run_structured_tasks`.
- **Level 3:** recommend supervised task-tool subagent execution with `run_structured_tasks`, but still ask before using it.

Rules:
- Never start task-tool subagent execution without explicit user approval.
- Do not use ad-hoc worker scripts, background bash loops, or manual subagent spawning for this workflow.
- If task-tool subagent execution is approved, call `run_structured_tasks` instead of spawning subagents manually.
- If the extension tool is unavailable, explain that this mode requires the structured-dev task extension and fall back to in-session execution if the user agrees.

Implementation by level:
- **Level 0:** implement the declared change and run the planned verification.
- **Level 1:** execute the approved in-band tasks and update the in-band checklist as you go.
- **Level 2 / Level 3:** execute the approved `TASKS.md` tasks in the approved execution mode and update progress in `TASKS.md`.

### Test-First Guidance

For behavior changes and bug fixes, prefer test-first implementation:

1. Add or update a focused test that captures the desired behavior.
2. Run it and confirm it fails for the expected reason.
3. Implement the smallest safe change.
4. Run the focused test and relevant suite.

If test-first is impractical, state why and choose an explicit alternate verification path before coding.

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

## PHASE 5.5: Review Level 2 / Level 3 Work

For Level 2 or Level 3, after implementation and before final verification, perform a review pass:

1. Compare changes against `TASKS.md` acceptance criteria.
2. Check for missing requirements, unrelated changes, and unapproved scope creep.
3. Check for obvious code quality, maintainability, and integration risks.
4. Fix critical or important issues before final verification.

If task-tool subagent execution was used, do not rely only on subagent success reports. Inspect the resulting changes and task updates.

## PHASE 6: Verify

**Goal:** Prove the change actually works.

Run, as applicable:
1. full test suite
2. lint/format checks
3. type checking
4. smoke test of the main functionality

Use fresh verification evidence before making completion claims.

Do not claim work is complete, fixed, passing, or successful until the relevant verification command or observable check has been run in the current session and its output has been read. Completion claims must include the evidence: command/check, pass/fail result, and any relevant caveat.

Report results by level:
- **Level 0 / Level 1:** provide the verification summary in chat
- **Level 2 / Level 3:** add a `## Verification` section to `TASKS.md` (see `references/TASKS-TEMPLATE.md`)

Verification summary fields:
- **Tests:** pass / fail / N/A
- **Lint:** pass / fail / N/A
- **Type check:** pass / fail / N/A
- **Smoke test:** pass / fail with brief note
- **Review:** Level 2/3 only — acceptance-criteria and scope review summary
- **Summary:** 1-2 sentence change summary

## Important Rules

1. Never skip Phase 3. Think and classify before writing code.
2. Do not silently make changes. Even Level 0 requires a declaration before implementation.
3. Update task progress in real time for any level that has tasks.
4. If `SPEC.md`, `PLAN.md`, or `TASKS.md` already exist for the active level, read them first and ask whether to continue or start fresh.

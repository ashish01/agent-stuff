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

| Level | Use When | Artifact Strategy | Details |
|-------|----------|-------------------|---------|
| **0 — Direct Execute** | trivial, unambiguous, negligible-risk mechanical edit | no artifacts; declare + execute | `references/level-0-direct.md` |
| **1 — Small Change** | clear, low-risk, small but multi-step | mini plan + checklist in chat; one approval | `references/level-1-small.md` |
| **2 — Medium Change** | reasonably clear outcome, multiple files/components, ordering, moderate risk, or resumability needed | `PLAN.md` then `TASKS.md` | `references/level-2-medium.md` |
| **3 — Large or Ambiguous** | ambiguous desired behavior, product/UX/scope choices, architecture changes, migration, or high risk | `SPEC.md` then `PLAN.md` then `TASKS.md` | `references/level-3-large-ambiguous.md` |

## Workflow Overview

```text
PHASE 1: Analyze → PHASE 2: Research (if needed) → PHASE 3: Think + Classify

Level 0: Declare → Implement → Verify
Level 1: Mini Plan + Checklist → Approval → Implement → Verify
Level 2: PLAN.md → Approval → TASKS.md → Approval → Execute → Verify
Level 3: SPEC.md → Approval → PLAN.md → Approval → TASKS.md → Approval → Execute → Verify
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

## PHASE 4+: Load Level Details

After classification, read the matching reference before creating artifacts or implementing:

- **Level 0:** read `references/level-0-direct.md`
- **Level 1:** read `references/level-1-small.md`
- **Level 2:** read `references/level-2-medium.md`; before execution, read `references/execution-modes.md`
- **Level 3:** read `references/level-3-large-ambiguous.md`; before execution, read `references/execution-modes.md`

Before final completion claims for any level, read `references/verification.md` and follow it.

## Important Rules

1. Never skip Phase 3. Think and classify before writing code.
2. Do not silently make changes. Even Level 0 requires a declaration before implementation.
3. Approval gates in the level reference are mandatory.
4. Update task progress in real time for any level that has tasks.
5. If `SPEC.md`, `PLAN.md`, or `TASKS.md` already exist for the active level, read them first and ask whether to continue or start fresh.

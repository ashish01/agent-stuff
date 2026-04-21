# Research Workflow

Use this only when Phase 2 determines that external verification is needed.

## Default in this Pi environment

Prefer the `playwright-cli` skill for browser-driven research because it is generally more reliable here.
Use `browser-tools` when it is a better fit for the page or task.

## Procedure

1. Identify the exact questions to verify.
   - API syntax?
   - version-specific behavior?
   - migration guidance?
   - security recommendations?

2. Prefer authoritative sources.
   - official docs
   - language/framework docs
   - GitHub changelogs / release notes
   - RFCs / specs
   - security advisories

3. Use `playwright-cli` to:
   - search for the relevant documentation
   - open the documentation page
   - inspect rendered content when JavaScript is required
   - extract the specific details needed for the decision

4. Use `browser-tools` instead when:
   - the browser-tools workflow is already active
   - the task specifically benefits from that toolchain
   - Playwright is unavailable or less effective for the target page

5. Stop once you have enough evidence to make the implementation decision.
   - Do not spend time collecting redundant confirmations.
   - Do not fall into generic tutorial browsing.

## Output format

Report research briefly in the main workflow:
- what you checked
- which source(s) you used
- the key findings that affected the plan

## Fallback

If browser-driven research is unavailable, say so and proceed with clearly stated confidence limits.

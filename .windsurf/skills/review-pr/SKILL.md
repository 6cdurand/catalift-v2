---
name: review-pr
description: Reviews a pull request via GitHub MCP — checks proof block, import boundaries, RLS policies, and spec compliance. Use when asked to review a PR.
---

# Review PR

When asked to review a pull request, follow this checklist:

## Steps

1. **Get PR details** via GitHub MCP:
   - `mcp0_pull_request_read` with method `get` — get PR title, body, state
   - `mcp0_pull_request_read` with method `get_diff` — get the full diff
   - `mcp0_pull_request_read` with method `get_files` — get list of changed files
   - `mcp0_pull_request_read` with method `get_check_runs` — get CI status

2. **Check CI gates passed:**
   - All check runs green? If not, block review until CI passes.

3. **Verify proof block is filled:**
   - `tsc --noEmit` output pasted? (not just checkbox checked)
   - `npm run lint` output pasted?
   - `npx playwright test` output pasted (if UI-facing)?
   - Grep proof for new symbols?
   - Regression note?
   - If any missing → request changes: "Proof block incomplete — paste terminal output for <missing item>"

4. **Check import boundaries:**
   - Grep the diff for `@/features/` imports
   - If a feature file imports from another feature → request changes
   - Shared code should be in `lib/`, `components/`, `hooks/`, `utils/`

5. **Check RLS (if migration in PR):**
   - Every new table has `ENABLE ROW LEVEL SECURITY`?
   - Every table has SELECT, INSERT, UPDATE, DELETE policies?
   - No `USING (true)`?
   - No `NOT VALID` FKs?
   - If any missing → request changes with specific policy requirements

6. **Check spec compliance:**
   - Read the linked Issue (if any)
   - Does the PR implement what the Issue asked for?
   - Does it stay in scope (no scope creep)?
   - Are deviations documented in the PR?

7. **Post review:**
   - If all checks pass → `mcp0_pull_request_review_write` with event `APPROVE`
   - If issues found → `mcp0_pull_request_review_write` with event `REQUEST_CHANGES` and specific comments
   - If just questions → `mcp0_pull_request_review_write` with event `COMMENT`

## Class A vs Class B

- **Class A** (application code): proof block + CI gates + import boundaries = enough to approve
- **Class B** (security/data): deep review of RLS, migration safety, auth changes. Never approve without reading every line of the diff.

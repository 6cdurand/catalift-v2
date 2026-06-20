---
description: Reviews a pull request via GitHub MCP — checks proof block, CI gates, import boundaries, RLS, and spec compliance
---

# Review PR

Review a pull request using the GitHub MCP tools.

## Steps

1. **Ask the user for the PR number** if not provided.

2. **Invoke the `review-pr` skill** — it has the full checklist:
   - Get PR details, diff, files, check runs
   - Verify proof block is filled with real terminal output
   - Check import boundaries (no cross-feature imports)
   - Check RLS policies (if migration in PR)
   - Check spec compliance against linked Issue
   - Post review (APPROVE, REQUEST_CHANGES, or COMMENT)

3. **Report back:** PR number, review decision, any issues found.

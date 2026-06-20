---
always_on: true
description: Every PR must include a filled proof block with terminal output evidence
---

# Proof Block Required

Every pull request must include a filled proof block. No proof, no merge.

## Required proof

From `.github/pull_request_template.md`:

- [ ] `tsc --noEmit` clean (paste tail output)
- [ ] `npm run lint` passes (paste tail output)
- [ ] `npx playwright test` passes (if UI-facing)
- [ ] New symbols mounted in target file (paste grep proof)
- [ ] Route renders without console errors (if UI-facing)
- [ ] Regression: existing flow still works (one line how verified)

## What counts as proof

- **Terminal output pasted into the PR.** Not "it passed" — the actual output.
- **Grep output.** `grep -r "newFunction" src/` showing the function is mounted where expected.
- **One-line regression note.** "Login still works — tested manually, entered credentials, landed on dashboard."

## What does NOT count as proof

- "I think it works"
- "Tests should pass"
- "I ran it but didn't check the output"
- Empty checkboxes

## Enforcement

Command-center reviews the proof block via GitHub MCP before approving. If the proof block is incomplete, the PR is blocked until it's filled.

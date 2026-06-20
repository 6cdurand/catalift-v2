---
name: triage-bug
description: Triages a bug report or Sentry alert — assesses severity, creates a bug file, and creates a GitHub Issue with the correct priority label. Use when a bug is reported or an error alert fires.
---

# Triage Bug

When a bug is reported or a Sentry alert fires, follow this procedure:

## Steps

1. **Gather information:**
   - What's the symptom? (error message, broken behavior, screenshot)
   - Who's affected? (everyone, some users, one user)
   - When did it start? (after a specific deploy, randomly, always)
   - Is it reproducible? (steps to reproduce)
   - Is data at risk? (data loss, data leakage, data corruption)

2. **Assess severity:**
   - **SEV-0**: Broken for everyone, data loss/leakage, auth broken, payments broken → `priority:p0`, hotfix flow
   - **SEV-1**: Broken for everyone, no data risk, core feature broken → `priority:p0`, hotfix flow
   - **SEV-2**: Broken for some users, workaround exists → `priority:p1`, normal flow
   - **SEV-3**: Cosmetic, minor, edge case → `priority:p3`, backlog

3. **Determine domain:**
   - Auth issue → `domain:auth`
   - Workout/set/program issue → `domain:workout-engine`
   - Client/trainer management → `domain:trainer-ops`
   - Messaging/chat/photos → `domain:messaging`
   - Data not saving/loading/syncing → `domain:data-sync`
   - CI/deploy/config → `domain:infra`

4. **Determine class:**
   - Involves RLS, migrations, auth, PII, payments → `class:b`
   - Everything else → `class:a`

5. **Create GitHub Issue** via `mcp0_issue_write`:
   - Title: `[BUG] <short description>`
   - Body: symptom, steps to reproduce, expected vs actual, severity, domain
   - Labels: `type:bugfix`, domain label, class label, priority label, `status:ready`

6. **If SEV-0/SEV-1:** Follow hotfix flow (see `docs/workflow.md`):
   - Branch `hotfix/<description>` from main
   - Minimal fix + tests
   - Expedited review
   - Merge → deploy → verify

7. **If SEV-2/SEV-3:** Normal flow — Issue goes to backlog, picked up in priority order.

## Report

After triage, report:
- Severity (SEV-0/1/2/3)
- Domain
- Class (A/B)
- Issue number created
- Whether hotfix flow is needed

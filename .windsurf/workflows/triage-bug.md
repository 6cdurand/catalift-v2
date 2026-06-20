---
description: Triages a bug report or Sentry alert — assesses severity, determines domain/class, creates a GitHub Issue with correct labels
---

# Triage Bug

Triage a bug report or error alert into a structured GitHub Issue.

## Steps

1. **Gather information from the user:**
   - What's the symptom?
   - Who's affected?
   - When did it start?
   - Is data at risk?

2. **Invoke the `triage-bug` skill** — it has the full procedure:
   - Assess severity (SEV-0/1/2/3)
   - Determine domain
   - Determine class (A/B)
   - Create GitHub Issue with correct labels
   - If SEV-0/1, flag for hotfix flow

3. **Report back:** Severity, domain, class, Issue number, whether hotfix is needed.

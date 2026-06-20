---
description: Authors a GitHub Issue from a plain-language goal — determines domain, class, priority, and writes acceptance criteria
---

# Create Issue

Take the user's plain-language goal and create a structured GitHub Issue.

## Steps

1. **Parse the goal.** What does the user want built? What feature area does it belong to?

2. **Determine domain:**
   - Auth/login/signup/session → `domain:auth`
   - Workout/set/program/exercise → `domain:workout-engine`
   - Client/trainer/program assignment → `domain:trainer-ops`
   - Messaging/chat/photos → `domain:messaging`
   - Data saving/loading/syncing → `domain:data-sync`
   - CI/deploy/config/tooling → `domain:infra`

3. **Determine class:**
   - Involves RLS, migrations, auth, PII, payments → `class:b`
   - Everything else → `class:a`

4. **Determine priority:**
   - Blocking, do now → `priority:p0`
   - High, do next → `priority:p1`
   - Medium, do soon → `priority:p2`
   - Low, backlog → `priority:p3`

5. **Determine type:**
   - New feature → `type:feature`
   - Fixing a bug → `type:bugfix`
   - Restructuring, no behavior change → `type:refactor`
   - CI, deployment, config → `type:infra`
   - Documentation → `type:docs`

6. **Write the Issue body** using the template:
   - **What to build** — clear description
   - **Acceptance criteria** — specific, testable checkboxes including gates
   - **Context** — relevant v1 lessons, schema facts, architecture constraints
   - **Out of scope** — what NOT to touch

7. **Create the Issue** via `mcp0_issue_write` with method `create`.

8. **Report back:** Issue number, title, labels applied.

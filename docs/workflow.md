# Catalift v2 — Development Workflow

> The system that keeps the app healthy with minimal technical thinking from Christo.
> Christo's role: state the goal, review the PR, merge. Everything else is automated or handled by command-center.

## Issue lifecycle

```
Christo states goal
      ↓
Command-center authors GitHub Issue (with domain label, class, acceptance criteria)
      ↓
Issue lands in backlog (labeled `status:ready`)
      ↓
Executor picks up Issue (Devin autonomous OR Cascade via paste)
      ↓
Executor creates branch, implements, runs gates
      ↓
Executor creates PR (with proof block)
      ↓
CI runs automatically (lint + tsc + e2e)
      ↓
Command-center reviews PR (via GitHub MCP)
      ↓
Christo reviews proof block + merges
      ↓
Netlify auto-deploys on merge to main
      ↓
Sentry monitors for errors post-deploy
```

## Issue labels

Every Issue gets these labels:

### Domain (exactly one)
- `domain:auth` — auth-agent
- `domain:workout-engine` — workout-engine-agent
- `domain:trainer-ops` — trainer-ops-agent
- `domain:messaging` — messaging-agent
- `domain:data-sync` — data-sync-agent
- `domain:mobile` — mobile-agent
- `domain:qa` — qa-agent
- `domain:design` — design-agent
- `domain:infra` — infrastructure (CI, deployment, config)

### Class (exactly one)
- `class:a` — application code (agent can implement + PR autonomously)
- `class:b` — security/data-critical (conductor review required before merge)

### Priority (exactly one)
- `priority:p0` — blocking, do now
- `priority:p1` — high, do next
- `priority:p2` — medium, do soon
- `priority:p3` — low, backlog

### Status (exactly one)
- `status:ready` — ready for an executor to pick up
- `status:in-progress` — executor is working on it
- `status:review` — PR is up, waiting for review
- `status:blocked` — blocked on something (noted in Issue comments)
- `status:done` — merged + deployed

### Type (exactly one)
- `type:feature` — new feature
- `type:bugfix` — fixing a bug
- `type:refactor` — restructuring code, no behavior change
- `type:infra` — CI, deployment, config, tooling
- `type:docs` — documentation only

## Issue template

Every Issue follows this structure (enforced by `.github/ISSUE_TEMPLATE/task.md`):

```markdown
## Domain
`<domain>`

## Class
A | B

## What to build
<clear description of what needs to be built>

## Acceptance criteria
- [ ] <specific, testable criteria>
- [ ] tsc --noEmit clean
- [ ] lint passes
- [ ] e2e smoke passes (if UI-facing)

## Context
<relevant v1 lessons, schema facts, architecture constraints>
<pasted from command-center — executors can't read command-center files>

## Out of scope
<what NOT to touch — prevents scope creep>
```

## Branch naming

```
feat/<domain>/<short-description>     → features
fix/<domain>/<short-description>      → bugfixes
refactor/<domain>/<short-description> → refactors
infra/<short-description>             → infrastructure
hotfix/<short-description>            → urgent prod fixes
```

Examples:
- `feat/workout-engine/unified-completion-pipeline`
- `fix/data-sync/hydrate-merge-not-replace`
- `infra/sentry-setup`

## PR template

Every PR must include a proof block (enforced by `.github/pull_request_template.md`):

```markdown
## What
<one-line summary>

## Issue
Closes #<issue-number>

## Proof
- [ ] tsc --noEmit clean (paste tail)
- [ ] lint passes (paste tail)
- [ ] e2e smoke passes (if UI-facing)
- [ ] new symbols mounted in target file (grep proof)
- [ ] route renders without console errors (if UI-facing)
- [ ] regression: existing flow still works (one line how verified)

## Schema touched?
Y/N — if Y, include migration ID + DDL summary

## Deviations from spec
<list any deviations, or "none">
```

## CI gates (on every PR)

1. `npm ci` — clean install
2. `npm run lint` — ESLint + import rules
3. `npx tsc --noEmit` — type check
4. `npx playwright test` — e2e smoke (if UI-facing)

**All must pass before merge.** No exceptions. This is the prevention net that catches bugs before they reach users.

## Review flow

### Class A (application code)
1. Executor creates PR with proof block
2. CI runs automatically
3. Command-center reviews via GitHub MCP (code structure, import rules, spec compliance)
4. Christo glances at proof block + merges

### Class B (security/data-critical)
1. Executor creates PR with proof block
2. CI runs automatically
3. Command-center does deep review (RLS policies, migration safety, auth changes)
4. Command-center posts review comments on PR
5. Christo reads review summary + merges (or requests changes)

## Deployment

- **PR merged to main** → Netlify auto-deploys to production
- **PR open** → Netlify deploys preview (for testing before merge)
- **Sentry** monitors production for errors post-deploy
- **If Sentry alerts** → command-center triages (bug → Issue → hotfix flow)

## Bug flow (post-release)

```
Sentry alert OR user report
      ↓
Command-center triages severity
      ↓
SEV-0/1 (broken for everyone) → hotfix flow
SEV-2 (broken for some) → Issue with priority:p1
SEV-3 (cosmetic/minor) → Issue with priority:p3
      ↓
Hotfix flow: branch hotfix/ from main → fix → PR → expedited review → merge → deploy
Normal flow: Issue → backlog → picked up in priority order
```

## Hotfix flow (SEV-0/1 only)

1. Command-center creates `active_bugs/BUG-XXX` in command-center
2. Command-center authors minimal hotfix Issue (labeled `priority:p0`, `type:bugfix`)
3. Executor branches `hotfix/<description>` from main
4. Executor implements minimal fix + tests
5. Expedited review (command-center + Christo)
6. Merge → deploy → verify
7. Command-center logs in DECISIONS.md + closes bug file

## What Christo does (and doesn't do)

### Christo does:
- States the goal (in plain language)
- Reads the FOR CHRISTO header on briefs
- Glances at PR proof block
- Merges PRs
- Reports bugs/symptoms (screenshots, error messages)
- Makes product decisions (what to build next, what to prioritize)

### Christo does NOT:
- Write code
- Debug code
- Run terminal commands (unless asked)
- Manage branches
- Review code line-by-line
- Configure CI/deployment

### Command-center does:
- Translates Christo's goals into GitHub Issues
- Pastes schema/architecture facts into Issues
- Reviews PRs via GitHub MCP
- Triages bugs (severity, root cause analysis)
- Authors hotfix briefs
- Logs decisions + status changes
- Monitors Sentry alerts (when configured)

### Executor (Devin/Cascade) does:
- Picks up Issues
- Creates branches
- Writes code
- Runs gates (lint, tsc, e2e)
- Creates PRs with proof blocks
- Responds to review comments

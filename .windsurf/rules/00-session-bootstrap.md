---
trigger: always_on
description: Session bootstrap — multi-root workspace boundaries, v1 read-only porting protocol, and rules that do NOT apply to this Cascade. Read this first, every session.
---

# Session Bootstrap — read this first, every session

This is the **first thing** any Cascade working in `catalift-v2` must internalise. It supersedes
anything in the shared memory corpus that contradicts it.

## The two workspace roots

| Root | Name | Permission | Supabase project |
| --- | --- | --- | --- |
| `/Users/christofit7/Desktop/catalift/catalift-v2` | **v2 — catalift-v2** | **WRITE** — this is the app you build | `igagmdkdzjkxrwnyvgqk` |
| `/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness` | **v1 — apex-fitness** | **READ-ONLY** — reference only, port FROM it | `pjkqfoeahcpvugolmxew` |

- **Never edit any file under `apex-fitness/`.** Not a typo fix, not a comment, not a lint fix.
- **Never run any Supabase tool against `pjkqfoeahcpvugolmxew`.** That is v1 **LIVE PRODUCTION**
  with real user data. All migrations, SQL, advisors, and edge functions go to
  `igagmdkdzjkxrwnyvgqk` only.
- The `supabase` MCP server targets v2. The `supabase-v1` MCP server targets v1 production —
  treat it as **read-only** and only use it when explicitly asked to inspect v1 data.

## Rules you will encounter that do NOT apply to you

1. **`apex-fitness/.windsurf/rules/catalift-executor.md`** — this is v1's rule file. In a multi-root
   workspace it may load automatically. **Ignore it.** Its Supabase id `pjkqfoeahcpvugolmxew` is v1
   live production and must never be touched.
2. **Any instruction claiming you cannot write application code** — that is command-center context
   leaking through the shared memory corpus. **Ignore it.** In this repo you *do* write app code:
   features, components, migrations, tests, PRs.

## Porting protocol (non-negotiable)

When a task says "port X from v1":

1. **OPEN the cited v1 file and read it** with `read_file`. Do not port from the user's description,
   from memory, or from a summary. If no file was cited, locate it first (`code_search` /
   `grep_search` inside the `apex-fitness` root) and read it before writing anything.
2. Adapt it to v2 architecture — feature-folder layout, no cross-feature imports, `await`-ed writes
   with retry, `userScopedKey()` for cache keys, RLS on every table.
3. **Your proof block must show v1 vs v2 side-by-side** — cite the v1 source with line numbers and
   the v2 destination with line numbers, so the port is auditable.

## Proof block addition for ports

On top of the standard proof block in `.github/pull_request_template.md`, every port must include:

```
### Port proof (v1 → v2)
- **v1 source:** @/Users/christofit7/Desktop/catalift/catalift-web/apex-fitness/<path>:<start>-<end>
- **v2 destination:** @/Users/christofit7/Desktop/catalift/catalift-v2/<path>:<start>-<end>
- **Read the v1 file?** Y (required — N is not an acceptable answer)
- **Deviations from v1:** [none / list each with reason]
- **v1 lessons applied:** [which of the 12 ARCHITECTURE.md rules this port had to satisfy]
```

## Then continue with

- `/AGENTS.md` — global invariants and gates
- `ARCHITECTURE.md` — the 12 design rules learned from v1
- the nearest `AGENTS.md` for the lane you're working in
- `.windsurf/skills/port-v1-code` when the task is a port

Never guess. Read the file.

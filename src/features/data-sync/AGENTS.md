# Data Sync Feature Rules

> Applies when working in `src/features/data-sync/`.
> This is the most critical feature. v1's sync layer was a 4,196-LOC god-file with fire-and-forget writes. v2 rebuilds it properly.

## What this feature owns

- Supabase read/write operations
- Hydration (loading data from Supabase into Zustand)
- Sync (persisting Zustand state to Supabase)
- Offline queue and retry
- Conflict resolution

## Standing rules

1. **No god-files.** v1 had `supabaseSync.ts` at 4,196 LOC. v2 splits by domain: `lib/auth-sync.ts`, `lib/workout-sync.ts`, `lib/messaging-sync.ts`, etc. Each file is under 300 LOC.

2. **Await + retry.** Every Supabase write is `await`ed with try/catch. On failure, retry up to 3 times with exponential backoff. If still failing, queue for offline sync and show the user an error.

3. **MERGE not REPLACE.** v1's hydration replaced the entire Zustand store on every fetch, causing race conditions and data loss. v2 uses a merge strategy: incoming data is merged into existing state, not replacing it. See `lib/hydrate-merge.ts`.

4. **No fire-and-forget.** v1 had 50+ fire-and-forget write patterns. v2: zero. Every write is awaited.

5. **User-scoped queries.** Every query includes `trainer_id = auth.uid()` or `client_id = auth.uid()`. No unscoped queries. No `fetchAllXFromSupabase()` functions.

6. **Sync direction.** Zustand is the source of truth for UI state. Supabase is the source of truth for persistence. On hydration, Supabase wins (merge into Zustand). On write, Zustand triggers a Supabase write.

7. **Offline queue.** If a write fails after retries, it goes into an offline queue (Zustand persisted). When back online, the queue drains. Show the user a "pending sync" indicator.

8. **No silent failures.** v1 silently dropped writes. v2: every write failure is logged to Sentry AND shown to the user. No silent failures.

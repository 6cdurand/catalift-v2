---
trigger: always_on
description: All Supabase writes must be awaited with retry — no fire-and-forget patterns
---

# Await + Retry Write Pattern

Every Supabase write (insert, update, upsert, delete) must be `await`ed with try/catch and retry logic.

## Scope: ALL Supabase writes anywhere under `src/`

This rule applies to **every** Supabase write in the codebase, no matter which file or folder it
lives in — features, hooks, stores, components, route handlers, server actions, `lib/`, scripts.

It is **not** limited to `src/features/data-sync/`. That narrow scoping is precisely why v1's
fire-and-forget personal-best writes were never caught: the write sites lived outside the sync
folder, so the rule never applied to them. Write sites are spread across the whole tree. If you are
calling `supabase.from(...).insert/update/upsert/delete(...)` — or any RPC that mutates — this rule
applies, full stop.

## Why

v1 had 50+ fire-and-forget write patterns. Writes were silently dropped when the network failed. Users lost workout sets, messages, and program changes without knowing.

## Pattern

```typescript
// WRONG — fire-and-forget, silently drops on failure
supabase.from('workout_sets').insert(set);

// WRONG — .then() chain, no retry
supabase.from('workout_sets').insert(set).then(() => {});

// RIGHT — await + retry
async function saveSet(set: WorkoutSet): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error } = await supabase.from('workout_sets').insert(set);
      if (error) throw error;
      return; // success
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        // Log to Sentry, queue for offline sync, show user error
        console.error(`saveSet failed after ${MAX_RETRIES} attempts:`, err);
        throw err;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

## No silent failures

Every write failure must be:
1. Logged to Sentry (when configured)
2. Shown to the user (toast, banner, or inline error)
3. Queued for offline sync (if applicable)

Never silently swallow a write error.

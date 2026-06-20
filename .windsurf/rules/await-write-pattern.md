---
glob: "src/features/data-sync/**"
description: All Supabase writes must be awaited with retry — no fire-and-forget patterns
---

# Await + Retry Write Pattern

Every Supabase write (insert, update, upsert, delete) must be `await`ed with try/catch and retry logic.

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

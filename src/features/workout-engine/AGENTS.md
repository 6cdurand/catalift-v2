# Workout Engine Feature Rules

> Applies when working in `src/features/workout-engine/`.

## What this feature owns

- Exercise library and block library
- Workout session tracking (set logging, rest timers)
- Workout completion pipeline (the unified flow v1 lacked)
- PB (personal best) detection
- Previous-set display
- Volume calculation

## Standing rules

1. **Volume = SUM of set_volumes.** Never store volume as a single number on the workout. Calculate it as the sum of all set volumes. This fixes the v1 inconsistent-count bug.

2. **Unified completion pipeline.** v1 had fragmented completion logic spread across multiple files. v2 has ONE pipeline: save sets → calculate volume → detect PBs → update workout status → sync. No shortcuts around it.

3. **Previous-set display.** When a user logs a set, show the previous session's set for the same exercise. This is a beta must-have. Fetch from Supabase, not from a stale cache.

4. **Exercise popup with history.** Clicking an exercise shows its history (past sets, past workouts, PBs). This is a beta must-have.

5. **Workout state must persist.** v1 lost workout state on tab switch because `useState` wasn't persisted. v2 uses Zustand `persist` middleware with user-scoped keys. State survives tab switches, app backgrounding, and crashes.

6. **No fire-and-forget writes.** Saving a set is `await`ed with retry. If it fails, show the user an error and retry. Never silently drop a set.

7. **Block library folders.** v1 had broken folder creation. v2: folders are first-class, creation works, and they're scoped to the trainer.

# .pipeline/v2-workout-w2a/spec.md — Stage 1 (PLAN)

> **Workout-Engine Wave 2a = the straight-set execution screen.** Ports v1's core set-logging loop
> (weight × reps input, complete-set, previous-set tap-to-fill, per-set volume display) onto the v2
> `LoggedWorkout` types from w1. This is the MOST-USED surface in the app — the core loop.
> Authored by command-center (Opus 4.8). **Place at `catalift-v2/.pipeline/v2-workout-w2a/spec.md`.**

**Class:** **A (UI port + Zustand store, NO migration).** The `workouts` table already exists; w1
built the types + serialize seam. This wave builds the interactive execution screen for STRAIGHT
sets only — superset/circuit/cardio/drop-sets/rest-timer are later sub-waves (w2b–w2d).
**Executor model:** **GLM 5.2** (UI port + assembly — per dossier w2 row). If GLM 5.2 is unavailable,
Opus 4.8 is acceptable.
**Repo:** catalift-v2 · **Branch:** `workout-w2a-straight-set-execution` (from `main`) · open a PR.

---

## What this wave does

1. **`src/features/workout-engine/stores/active-workout-store.ts`** — Zustand store holding the
   in-progress `LoggedWorkout`, with set-manipulation actions ported from v1's `workoutStore.ts`.
2. **`src/features/workout-engine/components/SetRow.tsx`** — a single set row (set number, previous,
   weight input, reps input, complete/undo button, per-set volume). Ported verbatim from v1's
   inline set-row JSX.
3. **`src/features/workout-engine/components/ExerciseCard.tsx`** — the exercise header (name, image,
   completed/total badge, menu) + the sets list + "Add Set" button. Ported from v1's inline card.
4. **`src/app/workout/active/page.tsx`** — the `/workout/active` route: auth guard, workout timer,
   exercise list, finish button. A focused subset of v1's 331KB page — straight-set blocks only.
5. **Unit tests** for the store + component tests for SetRow + an e2e smoke for the core loop.

**NOT in this wave (later sub-waves):**
- Superset/circuit/cardio block rendering (w2b, w2c)
- Rest timer + floating active-workout bar (w2d)
- Drop sets, timed sets, unilateral toggle, assisted-exercise logic (w2b)
- PB detection + toast (w3 — results)
- Exercise search/add modal (separate concern — exercise library box)
- Post-workout summary screen (w3)
- Trainer/client (PT) mode — this wave is self-mode only (`userId = auth.uid()`)

---

## ⚠️ STEP 0 — GROUND IN v1, do NOT greenfield (G-19)

**This is a PORT, not a new design.** The v1 execution screen is `src/app/workout/active/page.tsx`
(331KB). This wave extracts ONLY the straight-set logging flow from it. The v1 source sections are
pasted inline below because **you cannot read the v1 repo**. Copy the UI verbatim; change ONLY the
data source from v1's `useWorkoutStore` to the new v2 `activeWorkoutStore`, and adapt the set/exercise
types from v1's `WorkoutSet`/`WorkoutExercise` to v2's `LoggedSet`/`ExerciseEntry` (from w1).

### v1 type shapes (for reference — align field names)

v1 `WorkoutSet` (from `src/types/index.ts:108`):
```ts
interface WorkoutSet {
  id: string;
  setNumber: number;
  type: 'normal' | 'dropset' | 'warmup';  // v2: drop 'type' — w2a is 'normal' only
  weight?: number;                         // v2: number | null
  reps?: number;                           // v2: number | null
  duration?: number;                       // v2: durationSeconds?
  completed: boolean;
  previousWeight?: number;                 // v2: keep — drives tap-to-fill
  previousReps?: number;                   // v2: keep — drives tap-to-fill
  restTime?: number;                       // v2: drop — rest timer is w2d
  notes?: string;                          // v2: drop for now
  rpe?: number;                            // v2: drop for now
  drops?: DropSet[];                       // v2: drop — drop sets are w2b
  isAssisted?: boolean;                    // v2: drop for now — w2b
  isTimed?: boolean;                       // v2: drop for now — w2b
  roundIndex?: number;                     // v2: keep (circuit positioning, unused in w2a)
}
```

v1 `WorkoutExercise` (from `src/types/index.ts:131`):
```ts
interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;        // v2: drop the full Exercise object — store exerciseId + exerciseName only (ExerciseEntry shape from w1)
  sets: WorkoutSet[];
  notes?: string;
  restTimerSeconds: number;  // v2: drop — rest timer is w2d
  isWarmup?: boolean;        // v2: drop for now
  trainerNotes?: string;     // v2: drop for now
  groupId?: string;          // v2: drop — superset is w2b
  groupType?: string;        // v2: drop
  groupOrder?: string;       // v2: drop
  miniRestSeconds?: number;  // v2: drop
  isUnilateral?: boolean;    // v2: drop for now — w2b
  sequenceDuration?: number; // v2: drop
  blockType?: string;        // v2: drop — block kind is on the WorkoutBlock, not the entry
  blockId?: string;          // v2: drop
  blockName?: string;        // v2: drop
}
```

### v2 target types (from w1 — already merged to main)

These are in `src/features/workout-engine/types.ts` (already on `main`). USE THESE:
```ts
export interface LoggedSet {
  id: string;               // uuid v4 (G-10)
  weight: number | null;    // kg; null = bodyweight
  reps: number | null;
  completed: boolean;
  durationSeconds?: number; // unused in w2a (timed sets are w2b)
  roundIndex?: number;      // unused in w2a (circuit is w2c)
  stationIndex?: number;    // unused in w2a
  // w2a ADDITIONS (keep v1's previous-set UX):
  previousWeight?: number | null;  // drives tap-to-fill placeholder
  previousReps?: number | null;    // drives tap-to-fill placeholder
  setNumber: number;               // 1-based display index
}

export interface ExerciseEntry {
  id: string;              // uuid
  exerciseId: string;      // ref into exercises.ts library
  exerciseName: string;
  sets: LoggedSet[];
  notes?: string;
}

export type WorkoutBlock =
  | { id: string; kind: "straight"; exercise: ExerciseEntry }
  | { id: string; kind: "superset"; exercises: ExerciseEntry[] }
  | { id: string; kind: "circuit"; rounds: number; stations: ExerciseEntry[]; restSeconds?: number }
  | { id: string; kind: "cardio"; exerciseId: string; exerciseName: string; cardio: CardioPayload };

export interface LoggedWorkout {
  id: string;            // uuid → workouts.id
  userId: string;        // → workouts.user_id (= auth.uid(), G-01)
  name: string | null;
  performedAt: string;   // ISO → workouts.performed_at
  blocks: WorkoutBlock[];// → workouts.exercises (jsonb)
  totalVolume: number;   // → workouts.total_volume (SUM, G-13)
  notes?: string | null;
}
```

> **IMPORTANT:** You need to ADD `previousWeight`, `previousReps`, and `setNumber` to `LoggedSet` in
> `types.ts` (they're not in the w1 type but are needed for the v1 UI port). This is a backwards-
> compatible extension — add them as optional fields. Update the w1 unit tests if they assert the
> exact shape.

---

## 1. Active workout store (`src/features/workout-engine/stores/active-workout-store.ts`)

**PORT** v1's `src/lib/stores/workoutStore.ts` set-manipulation actions, adapted to v2 types.

### v1 source — store actions (paste reference)

v1 `addSet` (from `src/lib/stores/workoutStore.ts:741`):
```ts
addSet: (exerciseId) => {
  const { activeWorkout, workoutHistory, getActiveUserId } = get();
  if (!activeWorkout) return;

  const exercise = activeWorkout.exercises.find(e => e.id === exerciseId);
  if (!exercise) return;

  const targetUserId = getActiveUserId();
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const newSetIndex = exercise.sets.length;

  // v15-D2: NO fallthrough to older workouts. Read the most-recent
  // COMPLETED workout's sets via a single source-of-truth helper.
  const mostRecent = getMostRecentExerciseData(
    workoutHistory, exercise.exerciseId, targetUserId,
  );
  const lastSetData =
    mostRecent && newSetIndex < mostRecent.sets.length
      ? mostRecent.sets[newSetIndex]
      : undefined;

  const newSet: WorkoutSet = {
    id: uuidv4(),
    setNumber: exercise.sets.length + 1,
    type: 'normal',
    weight: lastSet?.weight,
    reps: lastSet?.reps,
    completed: false,
    previousWeight: lastSetData?.weight,
    previousReps: lastSetData?.reps,
  };

  set({
    activeWorkout: {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(e =>
        e.id === exerciseId
          ? { ...e, sets: [...e.sets, newSet] }
          : e
      ),
    },
  });
},
```

v1 `updateSet` (from `src/lib/stores/workoutStore.ts:825`):
```ts
updateSet: (exerciseId, setId, updates) => {
  const { activeWorkout } = get();
  if (!activeWorkout) return;

  set({
    activeWorkout: {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(e =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, ...updates } : s) }
          : e
      ),
    },
  });
},
```

v1 `completeSet` (from `src/lib/stores/workoutStore.ts:857`):
```ts
completeSet: (exerciseId, setId) => {
  const { activeWorkout, checkAndUpdatePB } = get();
  if (!activeWorkout) return;

  const exercise = activeWorkout.exercises.find(e => e.id === exerciseId);
  const setData = exercise?.sets.find(s => s.id === setId);

  if (setData?.weight && setData?.reps) {
    checkAndUpdatePB(exercise!.exerciseId, setData.weight, setData.reps, activeWorkout.id, exercise!.exercise?.name);
  }

  set({
    activeWorkout: {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(e =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, completed: true } : s) }
          : e
      ),
    },
  });
},
```

v1 `removeSet` (from `src/lib/stores/workoutStore.ts:795`):
```ts
removeSet: (exerciseId, setId) => {
  const { activeWorkout } = get();
  if (!activeWorkout) return;

  set({
    activeWorkout: {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(e =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.filter(s => s.id !== setId).map((s, idx) => ({ ...s, setNumber: idx + 1 })) }
          : e
      ),
    },
  });
},
```

v1 `uncompleteSet`:
```ts
uncompleteSet: (exerciseId, setId) => {
  const { activeWorkout } = get();
  if (!activeWorkout) return;
  set({
    activeWorkout: {
      ...activeWorkout,
      exercises: activeWorkout.exercises.map(e =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, completed: false } : s) }
          : e
      ),
    },
  });
},
```

### v2 store — TARGET shape

```ts
// src/features/workout-engine/stores/active-workout-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';  // or crypto.randomUUID()
import type { LoggedWorkout, WorkoutBlock, ExerciseEntry, LoggedSet } from '../types';
import { newId } from '../lib/ids';
import { computeTotalVolume } from '../lib/volume';

interface ActiveWorkoutState {
  activeWorkout: LoggedWorkout | null;
  workoutTimerSeconds: number;
  timerRunning: boolean;
  hasHydrated: boolean;

  // Workout lifecycle
  startWorkout: (params: { userId: string; name?: string }) => void;
  cancelWorkout: () => void;
  finishWorkout: () => Promise<LoggedWorkout | null>;  // serializes + persists via data-sync

  // Exercise actions (operate on the FIRST straight block — w2a is single-block)
  addExercise: (exercise: { exerciseId: string; exerciseName: string }) => void;
  removeExercise: (entryId: string) => void;

  // Set actions
  addSet: (entryId: string) => void;
  removeSet: (entryId: string, setId: string) => void;
  updateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  completeSet: (entryId: string, setId: string) => void;
  uncompleteSet: (entryId: string, setId: string) => void;

  // Timer
  tickTimer: () => void;
  toggleTimer: () => void;

  // Hydration
  setHasHydrated: (v: boolean) => void;
}
```

### Key adaptation rules

1. **Block structure:** v1 stored exercises as a flat `activeWorkout.exercises[]` array. v2 uses
   `LoggedWorkout.blocks: WorkoutBlock[]`. For w2a, **all exercises go into a SINGLE straight block**
   (`{ id, kind: "straight", exercise: ExerciseEntry }`). When `addExercise` is called, create a new
   straight block. When `removeExercise` is called, remove the block whose `exercise.id` matches.
   (This keeps the w1 type contract intact while w2a only handles straight sets.)

2. **Previous-set lookup:** v1 used `getMostRecentExerciseData(workoutHistory, exerciseId, userId)`.
   v2 doesn't have `workoutHistory` in the store yet (that's w3 results). For w2a, **pass `null` for
   previousWeight/previousReps** (no history lookup). The previous-set tap-to-fill UX will still
   render but show "—" until w3 wires the history. This is an acceptable stub.

3. **PB detection:** v1's `completeSet` calls `checkAndUpdatePB`. v2 **drops this for w2a** — PB
   detection is w3. Just flip `completed: true`.

4. **Volume:** v1 computed volume inline. v2 uses `computeTotalVolume` from `lib/volume.ts` (w1).
   Call it in `finishWorkout` to set `totalVolume` before persisting.

5. **Persist:** Use `persist` middleware with user-scoped key `catalift-active-workout-<userId>`.
   Store in IndexedDB via `lib/storage.ts` (or localStorage if IDB wrapper isn't ready — but auth
   token must be protected, G-03). The `hasHydrated` flag gates the redirect guard (same as v1).

6. **`finishWorkout`:** Serialize the `activeWorkout` via `toRow()` from `lib/serialize.ts` (w1),
   then `persist()` to the `workouts` table via `data-sync` (G-11 await+retry). Clear the store on
   success. On failure, keep `activeWorkout` intact for retry (same as v1 pattern).

---

## 2. SetRow component (`src/features/workout-engine/components/SetRow.tsx`)

**PORT VERBATIM** the set-row JSX from v1 `active/page.tsx:4047-4198`. This is the weight/reps input
row with the complete button.

### v1 source — set row JSX (paste reference)

```tsx
// v1 active/page.tsx:4047-4198 — the STRAIGHT-SET row (non-timed branch)
// Adapted: workoutExercise → entry, updateSet signature, completeSet signature

{/* Previous — tap to fill */}
<div className="col-span-3">
  {previousDisplay !== '—' ? (
    <div className="flex flex-col items-start">
      <button
        onClick={() => {
          if (!set.completed && set.previousWeight != null && set.previousReps) {
            updateSet(entry.id, set.id, {
              weight: Math.abs(set.previousWeight),
              reps: set.previousReps,
            });
          }
        }}
        disabled={set.completed}
        className="text-xs text-sky-500 hover:text-sky-400 active:scale-95 transition-all disabled:text-gray-500 disabled:cursor-default"
        title="Tap to fill"
      >
        {previousDisplay}
      </button>
    </div>
  ) : (
    <span className="text-xs text-gray-500">—</span>
  )}
</div>
{/* Weight Input */}
<div className="col-span-3">
  <Input
    type="number"
    inputMode="decimal"
    pattern="[0-9.]*"
    placeholder={set.previousWeight != null ? String(Math.abs(set.previousWeight)) : '0'}
    min="0"
    step="any"
    value={set.weight != null && set.weight !== undefined ? set.weight : ''}
    onFocus={(e) => e.target.select()}
    onChange={(e) => {
      const val = e.target.value;
      if (val === '' || val === undefined) {
        updateSet(entry.id, set.id, { weight: null });
      } else {
        updateSet(entry.id, set.id, { weight: parseFloat(val) });
      }
    }}
    disabled={set.completed}
    className={cn(
      "min-h-[44px] h-8 sm:h-9 text-center text-xs sm:text-sm bg-gray-50 border-gray-200 px-1",
      set.completed && "opacity-50",
      set.weight == null && set.previousWeight != null && "placeholder:text-sky-300"
    )}
  />
</div>
{/* Reps Input */}
<div className="col-span-3">
  <Input
    type="number"
    inputMode="numeric"
    pattern="[0-9]*"
    placeholder={set.previousReps != null ? String(set.previousReps) : '0'}
    min="0"
    value={set.reps != null && set.reps !== undefined ? set.reps : ''}
    onFocus={(e) => e.target.select()}
    onChange={(e) => {
      const val = e.target.value;
      if (val === '' || val === undefined) {
        updateSet(entry.id, set.id, { reps: null });
      } else {
        updateSet(entry.id, set.id, { reps: parseInt(val) });
      }
    }}
    disabled={set.completed}
    className={cn(
      "min-h-[44px] h-8 sm:h-9 text-center text-xs sm:text-sm bg-gray-50 border-gray-200 px-1",
      set.completed && "opacity-50",
      set.reps == null && set.previousReps != null && "placeholder:text-sky-300"
    )}
  />
</div>
{/* Complete Button */}
<div className="col-span-2 flex justify-end items-center gap-1">
  {!set.completed ? (
    <div className="flex items-center gap-0.5">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => removeSet(entry.id, set.id)}
        className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
        title="Delete set"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => completeSet(entry.id, set.id)}
        disabled={set.weight == null || !set.reps}
        className="h-9 w-9 text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 disabled:opacity-30"
        title="Complete set"
      >
        <Check className="w-5 h-5" />
      </Button>
    </div>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-500">
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-lg">
        <DropdownMenuItem
          className="text-orange-500 focus:text-orange-600"
          onClick={() => uncompleteSet(entry.id, set.id)}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Undo / Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-red-400 focus:text-red-300"
          onClick={() => removeSet(entry.id, set.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Set
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
{/* Per-set volume display */}
{set.completed && set.weight && set.reps && (
  <div className="flex items-center gap-2 ml-10 mt-0.5">
    <span className="text-[10px] text-gray-500">
      vol: {(set.weight * set.reps).toFixed(0)}kg
    </span>
  </div>
)}
```

### Props interface

```ts
interface SetRowProps {
  set: LoggedSet;
  entryId: string;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
}
```

### `previousDisplay` helper

```ts
// v1 used a computed previousDisplay. Port it:
const previousDisplay = set.previousWeight != null && set.previousReps != null
  ? `${Math.abs(set.previousWeight)}×${set.previousReps}`
  : '—';
```

---

## 3. ExerciseCard component (`src/features/workout-engine/components/ExerciseCard.tsx`)

**PORT** the exercise header + sets list + "Add Set" button from v1.

### v1 source — exercise header (paste reference)

```tsx
// v1 active/page.tsx:3822-3841 — exercise header (straight-set card)
<div className="bg-white border-b border-gray-100">
  <div className="px-4 py-3">
    <div className="flex items-center justify-between mb-1">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-gray-900">{entry.exerciseName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          {entry.sets.filter(s => s.completed).length}/{entry.sets.length}
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemoveExercise(entry.id)}
          className="h-8 w-8 text-gray-500 hover:text-red-400"
          title="Remove exercise"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
  {/* Sets header */}
  <div className="grid grid-cols-12 gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-50 text-[10px] sm:text-xs text-gray-500 font-medium">
    <div className="col-span-1">SET</div>
    <div className="col-span-3">PREVIOUS</div>
    <div className="col-span-3 text-center">KG</div>
    <div className="col-span-3 text-center">REPS</div>
    <div className="col-span-2" />
  </div>
  {/* Set rows */}
  <div className="divide-y divide-gray-100">
    {entry.sets.map((set, idx) => (
      <SetRow key={set.id} set={set} entryId={entry.id} ... />
    ))}
  </div>
  {/* Add Set button */}
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onAddSet(entry.id)}
    className="w-full text-xs text-gray-500 hover:text-sky-500 h-8"
  >
    <Plus className="w-3 h-3 mr-1" /> Add Set
  </Button>
</div>
```

> **DROP from v1:** ExerciseImage, ExerciseHowTo, PB badge, previous-workout history strip, volume
> comparison bar, notes button, the unilateral/assisted/superset/drop-set menu items, the
> MoreVertical dropdown. These are w2b/w3 concerns. Keep ONLY: name, completed/total badge, remove
> button, sets header, set rows, add-set button.

---

## 4. Active workout page (`src/app/workout/active/page.tsx`)

**PORT** the page shell from v1. This is a focused subset — straight-set blocks only.

### v1 source — redirect guard (paste reference)

```ts
// v1 active/page.tsx:97-126 — __shouldRedirectFromActiveWorkout
// PORT VERBATIM — this is a pure function, no v1 dependencies.

export type ActiveWorkoutRedirectTarget = 'auth' | 'workout' | null;

export function shouldRedirectFromActiveWorkout(params: {
  isAuthenticated: boolean;
  activeWorkout: unknown;
  showSummary: boolean;
  completedWorkoutData: unknown;
  isFinishing: boolean;
  hasHydrated?: boolean;
}): ActiveWorkoutRedirectTarget {
  if (!params.isAuthenticated) return 'auth';
  if (params.hasHydrated === false) return null;
  if (!params.activeWorkout && !params.showSummary && !params.completedWorkoutData && !params.isFinishing) {
    return 'workout';
  }
  return null;
}
```

### Page structure

```tsx
// src/app/workout/active/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth/hooks/useSession';
import { useActiveWorkoutStore } from '@/features/workout-engine/stores/active-workout-store';
import { ExerciseCard } from '@/features/workout-engine/components/ExerciseCard';
import { Button } from '@/components/ui/button';
import { shouldRedirectFromActiveWorkout } from './redirect-guard';

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const { activeWorkout, hasHydrated, addExercise, finishWorkout, isFinishing } = useActiveWorkoutStore();

  const redirect = shouldRedirectFromActiveWorkout({
    isAuthenticated: !!user,
    activeWorkout,
    showSummary: false,
    completedWorkoutData: null,
    isFinishing,
    hasHydrated,
  });

  useEffect(() => {
    if (redirect === 'auth') router.replace('/auth/login');
    if (redirect === 'workout') router.replace('/workout');
  }, [redirect, router]);

  if (redirect !== null) return null; // or a loading spinner

  return (
    <div className="min-h-screen bg-white">
      {/* Header: workout name + timer + finish button */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium text-gray-900">{activeWorkout?.name || 'Workout'}</p>
            <p className="text-xs text-gray-500">{formatTime(activeWorkoutTimerSeconds)}</p>
          </div>
          <Button
            onClick={handleFinish}
            disabled={isFinishing}
            className="bg-sky-500 text-white"
          >
            {isFinishing ? 'Saving...' : 'Finish'}
          </Button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="divide-y divide-gray-100">
        {activeWorkout?.blocks.map(block =>
          block.kind === 'straight' ? (
            <ExerciseCard
              key={block.id}
              entry={block.exercise}
              onAddSet={addSet}
              onUpdateSet={updateSet}
              onCompleteSet={completeSet}
              onUncompleteSet={uncompleteSet}
              onRemoveSet={removeSet}
              onRemoveExercise={removeExercise}
            />
          ) : null
        )}
      </div>

      {/* Add exercise button (stub — opens a simple search or manual entry) */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddExercise(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Exercise
        </Button>
      </div>
    </div>
  );
}
```

> **Add Exercise:** For w2a, a minimal exercise picker is fine — a simple text input + search against
> `src/lib/exercises.ts` (already ported to v2). Don't build the full v1 modal with custom exercise
> creation, filters, etc. Just enough to pick an exercise and call `addExercise`.

### `handleFinish`

```ts
const handleFinish = async () => {
  if (isFinishing) return;
  const completed = await finishWorkout();
  if (completed) {
    router.push('/workout');  // or a summary page (w3)
  } else {
    toast.error('Could not save workout. Please try again.');
  }
};
```

---

## 5. Tests

### Unit tests — store (`src/features/workout-engine/stores/__tests__/active-workout-store.test.ts`)

```
[ ] startWorkout creates a LoggedWorkout with uuid id, userId, performedAt=now, empty blocks
[ ] addExercise creates a straight block with a uuid block id + entry id
[ ] addSet adds a LoggedSet with uuid id, setNumber = length+1, completed=false, weight/reps = null
[ ] addSet sets previousWeight/previousReps to null (no history in w2a)
[ ] updateSet patches the named set fields
[ ] completeSet flips completed=true
[ ] uncompleteSet flips completed=false
[ ] removeSet removes the set and renumbers remaining sets (setNumber = idx+1)
[ ] removeExercise removes the straight block whose exercise.id matches
[ ] finishWorkout sets totalVolume = SUM(weight*reps) across all completed sets (G-13)
[ ] finishWorkout calls persist() to the workouts table (mock the data-sync persist)
[ ] finishWorkout clears activeWorkout on success
[ ] finishWorkout keeps activeWorkout on failure (retry-able)
[ ] all ids are valid uuid v4 (G-10)
```

### Component tests — SetRow (`src/features/workout-engine/components/__tests__/SetRow.test.tsx`)

```
[ ] renders set number, weight input, reps input, complete button
[ ] weight input shows placeholder from previousWeight when set.weight is null
[ ] reps input shows placeholder from previousReps when set.reps is null
[ ] typing in weight input calls onUpdateSet with { weight: <number> }
[ ] typing in reps input calls onUpdateSet with { reps: <number> }
[ ] clearing weight input calls onUpdateSet with { weight: null }
[ ] complete button is disabled when weight is null or reps is null
[ ] clicking complete calls onCompleteSet
[ ] completed set shows volume (weight × reps) in kg
[ ] completed set shows dropdown with Undo/Edit and Delete
[ ] clicking Undo calls onUncompleteSet
[ ] clicking Delete calls onRemoveSet
[ ] tap-to-fill: clicking previous display fills weight + reps from previousWeight/previousReps
```

### e2e — core loop (`tests/e2e/workout-straight-set.spec.ts`)

```
[ ] login → navigate to /workout → click "Start Workout" → redirected to /workout/active
[ ] add an exercise (e.g. "Bench Press") → exercise card appears
[ ] click "Add Set" → a set row appears with empty weight/reps
[ ] type 80 in weight, 8 in reps → click complete → set shows completed + volume "640kg"
[ ] click "Add Set" again → second set row appears
[ ] click "Finish" → workout saves → redirected to /workout
[ ] the saved workout appears in the workouts table (verify via Supabase query or /workout/history)
```

---

## Guardrails — must-not-regress checklist

Paste into `changes.md` proof block:

```
[ ] G-01 identity: activeWorkout.userId = auth.uid() — no canonical_user_id layer
[ ] G-09 hydration MERGES by id — persist middleware doesn't wipe on rehydrate (test: add set, rehydrate, set still there)
[ ] G-10 all client-generated ids (workout, block, entry, set) are valid uuid v4
[ ] G-11 finishWorkout uses persist() (await + retry) — never fire-and-forget
[ ] G-12 finishWorkout writes to workouts table AND the workout can be read back (fromRow)
[ ] G-13 totalVolume = SUM(weight*reps) across all completed sets — never MAX
[ ] G-16 separate Zustand store (active-workout-store) — doesn't reuse another resource's store
[ ] G-17 derived UI (completed/total badge, volume display) updates live — no stale memo
[ ] G-18 /workout/active survives a hard refresh (SSR session + persist rehydrate) — no /auth bounce
[ ] G-19 PORTED v1 set-row + exercise-card JSX verbatim — only data source changed; no net-new components
[ ] tsc + lint + unit + e2e all green
```

---

## Acceptance criteria

- [ ] `/workout/active` renders with auth guard + redirect logic
- [ ] Can start a workout, add an exercise, log sets (weight × reps), complete sets
- [ ] Completed sets show per-set volume (weight × reps in kg)
- [ ] Previous-set tap-to-fill works (when previousWeight/previousReps are present)
- [ ] "Finish" saves the workout to the `workouts` table via `persist()` (G-11)
- [ ] Saved workout can be read back via `fromRow()` (G-12)
- [ ] `totalVolume` = SUM of all completed set volumes (G-13)
- [ ] All ids are uuid v4 (G-10)
- [ ] Hard refresh on `/workout/active` keeps the in-progress workout (persist + rehydrate)
- [ ] `tsc --noEmit` clean
- [ ] Lint passes
- [ ] All unit + component + e2e tests green
- [ ] No `console.log` in production code
- [ ] No `localStorage` direct access (use `lib/storage.ts`)
- [ ] No `canonical_user_id` / `password_hash` / `apex-` legacy strings (grep → 0)

---

## Cross-references

- w1 types + serialize → `src/features/workout-engine/types.ts`, `lib/serialize.ts`, `lib/volume.ts`, `lib/ids.ts` (on `main`)
- v1 source → `src/app/workout/active/page.tsx` (331KB — sections pasted inline above)
- v1 store → `src/lib/stores/workoutStore.ts` (sections pasted inline above)
- Reuse map → `plans/v1_to_v2_reuse_map.md` (§A UI port, §C store rewire, §E fix-while-porting)
- Guardrails → `plans/v2_guardrails.md` (G-09, G-10, G-11, G-12, G-13, G-16, G-17, G-18, G-19)
- Dossier → `domains/01-workout-engine/DOSSIER.md` (w2 row: "Execution screen port + await/retry writes")
- Pipeline model → `plans/v2_pipeline_model.md` (Plan→Code→Test→Review)

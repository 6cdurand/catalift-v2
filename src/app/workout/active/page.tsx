'use client';

// Active workout page — the straight-set execution screen (w2a, ported from v1 active/page.tsx).
// Auth guard, timer, exercise list, finish button. w2a: straight sets only; superset/circuit/cardio/rest-timer are later waves.

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart, Flame, Dumbbell, Zap, Link2, Pause, Play, ChevronDown, StickyNote, Timer } from 'lucide-react';
import { exerciseLibrary, allExercises } from '@/lib/exercises';
import {
  createAndPersistCustomExercise,
  loadCustomExercises,
  CUSTOM_EXERCISE_CATEGORIES,
  type CustomExerciseCategory,
} from '@/lib/exercises';
import { searchExercises } from '@/lib/exerciseSearch';
import type { Exercise } from '@/types';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { useActiveWorkoutStore } from '@/features/workout-engine/stores/active-workout-store';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { CardioCard } from '@/features/workout-engine/components/CardioCard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { SupersetCard } from '@/features/workout-engine/components/SupersetCard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { CircuitCard } from '@/features/workout-engine/components/CircuitCard';
import { useSession } from '@/features/auth';
import { shouldRedirectFromActiveWorkout } from './redirect-guard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { WorkoutSummary } from '@/features/workout-engine/components/WorkoutSummary';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { computeSummaryData, type SummaryData } from '@/features/workout-engine/lib/summarize-blocks';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import {
  fetchWorkoutHistoryWithBlocks,
  type WorkoutHistoryBlocks,
} from '@/features/workout-engine/api/fetch-history';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import {
  detectNewPRs,
  buildPreviousBests,
  newPersonalBestOneRm,
  type PreviousBest,
} from '@/features/workout-engine/lib/history-stats';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { upsertPersonalBests } from '@/features/workout-engine/api/upsert-personal-bests';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import {
  fetchPersonalBests,
  type PersonalBestItem,
} from '@/features/workout-engine/api/fetch-personal-bests';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { computeSetVolume } from '@/features/workout-engine/lib/volume';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { StraightBlockCard } from '@/features/workout-engine/components/StraightBlockCard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import type { ExercisePBBadges } from '@/features/workout-engine/components/ExerciseCard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import type { ExerciseEntry, WorkoutBlock, StraightBlockType } from '@/features/workout-engine/types';
import { getExerciseAnimationUrl } from '@/lib/exerciseAnimations';
import { getExerciseById, getMuscleDisplayName } from '@/lib/exercises';
import { normalizeExerciseId } from '@/lib/exerciseStats';
import type { MuscleGroup } from '@/types';
import { toast } from 'sonner';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import shared UI
import { Toaster } from '@/components/ui/sonner';

// Blue photo header backdrop (v1 active header ~2919-3060). Athlete-context sky theme.
const WORKOUT_HEADER_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=300&fit=crop&crop=center';

// Small exercise-picker thumbnail (v1 fidelity). Fallback = no image box, just the
// name (v1 active/page.tsx:4941). Render wire-up only.
function ExerciseThumb({ id }: { id: string }) {
  const url = getExerciseAnimationUrl(id);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated GIF thumbnail; next/image breaks GIF animation
    <img
      src={url}
      alt=""
      aria-hidden="true"
      className="w-10 h-10 rounded-md object-cover bg-gray-100 shrink-0"
    />
  );
}

// Exercise picker with search + create custom exercise (w6a: ported from v1 CreateCustomExerciseDialog)
function AddExerciseModal({
  onAdd,
  onClose,
  userId,
}: {
  onAdd: (ex: { exerciseId: string; exerciseName: string }) => void;
  onClose: () => void;
  userId: string | null | undefined;
}) {
  const [search, setSearch] = useState('');
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState<CustomExerciseCategory | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Load custom exercises from IDB on mount
  useEffect(() => {
    loadCustomExercises(userId).then(setCustomExercises);
  }, [userId]);

  const trimmed = search.trim();
  const results = trimmed
    ? searchExercises(trimmed, { extraExercises: customExercises, limit: 20 })
    : [...exerciseLibrary, ...customExercises];

  const handleSelect = (ex: { id: string; name: string }) => {
    onAdd({ exerciseId: ex.id, exerciseName: ex.name });
    onClose();
  };

  const handleCreateClick = () => {
    setCreateName(trimmed);
    setCreateCategory('');
    setShowCreate(true);
  };

  const handleCreateSubmit = async () => {
    if (!createName.trim() || !createCategory || !userId || submitting) return;
    setSubmitting(true);
    try {
      const exercise = await createAndPersistCustomExercise({
        name: createName.trim(),
        category: createCategory as CustomExerciseCategory,
        userId,
      });
      setCustomExercises(prev => [...prev, exercise]);
      onAdd({ exerciseId: exercise.id, exerciseName: exercise.name });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Add Exercise</h3>
        <Input
          placeholder="Search exercises (e.g. Bench Press)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelect({ id: ex.id, name: ex.name })}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0 flex items-center gap-3"
            >
              <ExerciseThumb id={ex.id} />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{ex.name}</div>
                {ex.equipment && (
                  <div className="text-xs text-gray-500 truncate">{ex.equipment}</div>
                )}
              </div>
            </button>
          ))}
          {trimmed && (
            <button
              onClick={handleCreateClick}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-sm text-sky-600">
                Create &apos;{trimmed}&apos;
              </div>
              <div className="text-xs text-gray-500">Add as a custom exercise</div>
            </button>
          )}
          {!trimmed && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No exercises found
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>

      {/* Create custom exercise dialog (ported from v1 CreateCustomExerciseDialog) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-1">Create exercise</h3>
            <p className="text-sm text-gray-500 mb-4">
              This exercise will be saved to your personal library.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="custom-exercise-name">Name</Label>
                <Input
                  id="custom-exercise-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. High-cable woodchop"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={createCategory}
                  onValueChange={(v) => setCreateCategory(v as CustomExerciseCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_EXERCISE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={!createName.trim() || !createCategory || submitting}
              >
                {submitting ? 'Creating…' : 'Create + use'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Cardio exercise picker + initial duration entry (w2c)
function AddCardioModal({
  onAdd,
  onClose,
  userId,
}: {
  onAdd: (params: { exerciseId: string; exerciseName: string; cardio: { durationSeconds: number } }) => void;
  onClose: () => void;
  userId: string | null | undefined;
}) {
  const [search, setSearch] = useState('');
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [duration, setDuration] = useState('');

  useEffect(() => {
    loadCustomExercises(userId).then(setCustomExercises);
  }, [userId]);

  const trimmed = search.trim();
  const results = trimmed
    ? searchExercises(trimmed, { extraExercises: customExercises, limit: 20 })
    : [...allExercises, ...customExercises];

  const handleConfirm = () => {
    if (!selected || !duration) return;
    const minutes = parseFloat(duration);
    if (isNaN(minutes) || minutes <= 0) return;
    onAdd({
      exerciseId: selected.id,
      exerciseName: selected.name,
      cardio: { durationSeconds: Math.round(minutes * 60) },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-label="Add cardio exercise">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Add Cardio</h3>

        {!selected ? (
          <>
            <Input
              placeholder="Search cardio exercises (e.g. Running)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded">
              {results.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelected({ id: ex.id, name: ex.name })}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0 flex items-center gap-3"
                >
                  <ExerciseThumb id={ex.id} />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{ex.name}</div>
                    {ex.equipment && (
                      <div className="text-xs text-gray-500 truncate">{ex.equipment}</div>
                    )}
                  </div>
                </button>
              ))}
              {!trimmed && results.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No exercises found
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-sm">{selected.name}</span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-sky-500 hover:text-sky-400"
              >
                Change
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cardio-duration-input">Duration (minutes)</Label>
              <Input
                id="cardio-duration-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                autoFocus
              />
            </div>
          </>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {selected && (
            <Button
              onClick={handleConfirm}
              disabled={!duration || isNaN(parseFloat(duration))}
              className="flex-1 bg-emerald-500 text-white"
            >
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Multi-exercise picker for superset/circuit blocks (w2b)
function AddBlockModal({
  mode,
  onAdd,
  onClose,
  userId,
}: {
  mode: 'superset' | 'circuit';
  onAdd: (
    exercises: { exerciseId: string; exerciseName: string }[],
    params?: { rounds?: number; restSeconds?: number },
  ) => void;
  onClose: () => void;
  userId: string | null | undefined;
}) {
  const [search, setSearch] = useState('');
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<{ exerciseId: string; exerciseName: string }[]>([]);
  const [rounds, setRounds] = useState('3');
  const [restSeconds, setRestSeconds] = useState('');

  useEffect(() => {
    loadCustomExercises(userId).then(setCustomExercises);
  }, [userId]);

  const trimmed = search.trim();
  const results = trimmed
    ? searchExercises(trimmed, { extraExercises: customExercises, limit: 20 })
    : [...exerciseLibrary, ...customExercises];

  const toggleSelect = (ex: { id: string; name: string }) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.exerciseId === ex.id);
      if (exists) return prev.filter((p) => p.exerciseId !== ex.id);
      return [...prev, { exerciseId: ex.id, exerciseName: ex.name }];
    });
  };

  const minExercises = mode === 'superset' ? 2 : 1;
  const canAdd = selected.length >= minExercises;

  const handleAdd = () => {
    if (!canAdd) return;
    if (mode === 'superset') {
      onAdd(selected);
    } else {
      onAdd(selected, {
        rounds: parseInt(rounds, 10) || 3,
        restSeconds: restSeconds ? parseInt(restSeconds, 10) : undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium mb-1">
          {mode === 'superset' ? 'Add Superset' : 'Add Circuit'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {mode === 'superset'
            ? 'Select 2+ exercises to perform back-to-back.'
            : 'Select stations and set the number of rounds.'}
        </p>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map((ex) => (
              <button
                key={ex.exerciseId}
                onClick={() => toggleSelect({ id: ex.exerciseId, name: ex.exerciseName })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-sky-100 text-sky-700 text-xs hover:bg-sky-200"
              >
                {ex.exerciseName}
                <span className="text-sky-400">×</span>
              </button>
            ))}
          </div>
        )}

        <Input
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded">
          {results.map((ex) => {
            const isSelected = selected.some((s) => s.exerciseId === ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => toggleSelect({ id: ex.id, name: ex.name })}
                className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-0 flex items-center gap-3 ${
                  isSelected ? 'bg-sky-50' : 'hover:bg-gray-100'
                }`}
              >
                <ExerciseThumb id={ex.id} />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{ex.name}</div>
                  {ex.equipment && (
                    <div className="text-xs text-gray-500 truncate">{ex.equipment}</div>
                  )}
                </div>
              </button>
            );
          })}
          {!trimmed && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No exercises found
            </div>
          )}
        </div>

        {mode === 'circuit' && (
          <div className="flex gap-3 mt-4">
            <div className="flex-1">
              <Label htmlFor="circuit-rounds">Rounds</Label>
              <Input
                id="circuit-rounds"
                type="number"
                min="1"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="circuit-rest">Rest (sec)</Label>
              <Input
                id="circuit-rest"
                type="number"
                min="0"
                placeholder="0"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canAdd}
            className="flex-1 bg-sky-500 text-white"
          >
            {mode === 'superset'
              ? `Add ${selected.length || ''} Superset`
              : `Add ${selected.length || ''} Circuit`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Superset picker — faithful port of v1 active/page.tsx:6006. Pick a SECOND straight
// exercise to pair with the source; both merge into one A1/A2 superset block.
function SupersetPicker({
  sourceName,
  candidates,
  onPick,
  onClose,
}: {
  sourceName: string;
  candidates: { entryId: string; name: string; setCount: number }[];
  onPick: (targetEntryId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-label="Create superset"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-500" />
          Create Superset
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select another exercise to pair with {sourceName}
        </p>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {candidates.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 text-center">
              Add another standalone exercise first to pair it.
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.entryId}
                onClick={() => onPick(c.entryId)}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
              >
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.setCount} sets</p>
              </button>
            ))
          )}
        </div>

        <Button
          variant="outline"
          onClick={onClose}
          className="w-full mt-4 border-gray-200 text-gray-500"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const {
    activeWorkout,
    hasHydrated,
    isFinishing,
    workoutTimerSeconds,
    timerRunning,
    tickTimer,
    restTimer,
    startWorkout,
    addBlock,
    setActiveBlock,
    setWorkoutNotes,
    addExercise,
    removeExercise,
    addCircuitBlock,
    removeBlock,
    addRound,
    addSet,
    updateSet,
    completeSet,
    uncompleteSet,
    removeSet,
    addDropSet,
    updateDrop,
    removeDrop,
    createSuperset,
    addCardioBlock,
    updateCardio,
    finishWorkout,
    setPreviousBests,
    startRestTimer,
    tickRestTimer,
    resetRestTimer,
    pauseWorkoutTimer,
    resumeWorkoutTimer,
  } = useActiveWorkoutStore();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddCardio, setShowAddCardio] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState<'superset' | 'circuit' | false>(false);
  // v1 header note control (#82): toggles the note panel below the blue header.
  const [showNotes, setShowNotes] = useState(false);
  // Superset creation source (v1 :1336): the straight exercise the user chose to pair.
  const [supersetSource, setSupersetSource] = useState<{ entryId: string; name: string } | null>(null);
  const [readyToRedirect, setReadyToRedirect] = useState(false);
  const workoutStartAttempted = useRef(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  // Cached workout history (blocks) — feeds the Previous column + finish-time PB detection.
  const historyRef = useRef<WorkoutHistoryBlocks[]>([]);
  // B1: Per-set rest timers (ported from v1 active/page.tsx:408)
  const [setRestTimers, setSetRestTimers] = useState<Record<string, { remaining: number; total: number }>>({});
  // #83 PB badges: all-time PBs keyed by normalized exerciseId (from personal_bests) —
  // feeds the 🏆 PB badge + volume bar + the once-per-exercise PB toast. Best-effort.
  const [personalBests, setPersonalBests] = useState<Record<string, PersonalBestItem>>({});
  // Previous-session context (date + last sets) keyed by exerciseId — feeds the 🕐 badge.
  const [previousBests, setPreviousBestsState] = useState<Record<string, PreviousBest>>({});
  // PB toast de-dupe: exerciseIds already celebrated this session (fire once per exercise).
  const toastedPbRef = useRef<Set<string>>(new Set());

  // Real session (BUG-014 fix)
  const { user, loading } = useSession();

  // Start a workout on mount if none exists (so e2e can drive the flow)
  useEffect(() => {
    if (user && hasHydrated && !activeWorkout && !isFinishing && !workoutStartAttempted.current) {
      startWorkout({ userId: user.id, name: 'Workout' });
      workoutStartAttempted.current = true;
      setReadyToRedirect(true);
    } else if (user && hasHydrated && !workoutStartAttempted.current) {
      // If we already have a workout (or are finishing), we're ready to redirect
      setReadyToRedirect(true);
    }
  }, [user, hasHydrated, activeWorkout, isFinishing, startWorkout]);

  const redirect = shouldRedirectFromActiveWorkout({
    isAuthenticated: !!user,
    activeWorkout,
    showSummary,
    completedWorkoutData: summaryData,
    isFinishing,
    hasHydrated,
  });

  useEffect(() => {
    // Only redirect after we've attempted to start a workout (avoids race where redirect fires before startWorkout)
    if (!loading && readyToRedirect) {
      if (redirect === 'auth') router.replace('/login');
      if (redirect === 'workout') router.replace('/workouts');
    }
  }, [redirect, router, loading, readyToRedirect]);

  // F4: Tick the workout timer (1-second interval while running)
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, tickTimer]);

  // B1: Rest timer tick (ported from v1 active/page.tsx:835-840)
  useEffect(() => {
    if (!restTimer.isRunning) return;
    const interval = setInterval(tickRestTimer, 1000);
    return () => clearInterval(interval);
  }, [restTimer.isRunning, tickRestTimer]);

  // B1: Per-set rest timers tick (ported from v1 active/page.tsx:863-884)
  useEffect(() => {
    const hasActiveTimers = Object.values(setRestTimers).some((t) => t.remaining > 0);
    if (!hasActiveTimers) return;

    const interval = setInterval(() => {
      setSetRestTimers((prev) => {
        const updated: Record<string, { remaining: number; total: number }> = {};
        for (const [setId, timer] of Object.entries(prev)) {
          if (timer.remaining > 0) {
            updated[setId] = { ...timer, remaining: timer.remaining - 1 };
          } else {
            // Keep timer at 0 so it shows red "done" state
            updated[setId] = { ...timer, remaining: 0 };
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setRestTimers]);

  // Load workout history (blocks) once the session is known. Seeds the Previous
  // column (tap-to-fill) via the store, and is reused for finish-time PB
  // detection. Read-only, RLS-scoped; best-effort (Previous simply stays blank
  // on failure). No writes — Class A.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchWorkoutHistoryWithBlocks(user.id)
      .then((hist) => {
        if (cancelled) return;
        historyRef.current = hist;
        const prev = buildPreviousBests(hist);
        setPreviousBests(prev); // store: tap-to-fill (weight/reps)
        setPreviousBestsState(prev); // local: 🕐 badge (date + last sets)
      })
      .catch(() => {
        /* history is best-effort; the Previous column just stays blank */
      });
    return () => {
      cancelled = true;
    };
  }, [user, setPreviousBests]);

  // #83: Load all-time PBs (personal_bests) for the 🏆 badge + volume bar + PB toast.
  // Read-only, RLS-scoped, best-effort — badges simply stay hidden on failure.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchPersonalBests(user.id)
      .then((pbs) => {
        if (cancelled) return;
        const map: Record<string, PersonalBestItem> = {};
        for (const pb of pbs) map[normalizeExerciseId(pb.exerciseId)] = pb;
        setPersonalBests(map);
      })
      .catch(() => {
        /* PBs are best-effort; badges just stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || redirect !== null) return null;

  // Render summary screen when workout is finished and summary is showing
  if (showSummary && summaryData) {
    return (
      <WorkoutSummary
        data={summaryData}
        onClose={() => {
          setShowSummary(false);
          setSummaryData(null);
          router.push('/workouts');
        }}
      />
    );
  }

  // Flatten a block into its exercise entries (straight/superset hold `exercises`,
  // circuit holds `stations`, cardio has none). Shared by the PB toast + badge builders.
  const entriesOfBlock = (b: WorkoutBlock): ExerciseEntry[] => {
    if (b.kind === 'straight') return b.exercises;
    if (b.kind === 'superset') return b.exercises;
    if (b.kind === 'circuit') return b.stations;
    return [];
  };

  // #83 PB toast: when the just-completed set's e1RM beats the prior all-time best for
  // that exercise, celebrate ONCE per exercise per session (toastedPbRef guard). Drops
  // never feed e1RM (types.ts) — only the parent working set can set a PB.
  const maybeCelebratePb = (entryId: string, setId: string) => {
    for (const b of activeWorkout?.blocks ?? []) {
      const entry = entriesOfBlock(b).find((e) => e.id === entryId);
      if (!entry) continue;
      const set = entry.sets.find((s) => s.id === setId);
      if (!set) return;
      const normId = normalizeExerciseId(entry.exerciseId);
      if (toastedPbRef.current.has(normId)) return;
      const priorBest = personalBests[normId]?.oneRepMax ?? 0;
      const e1rm = newPersonalBestOneRm(set.weight, set.reps, priorBest);
      if (e1rm != null) {
        toastedPbRef.current.add(normId);
        toast.success(
          `New Personal Best! 🏆 ${entry.exerciseName} · ${set.weight}kg × ${set.reps} (${Math.round(e1rm)}kg e1RM)`,
        );
      }
      return;
    }
  };

  // B1: Wrap completeSet to start per-set rest timer (ported from v1)
  const handleCompleteSet = (entryId: string, setId: string) => {
    completeSet(entryId, setId);
    // Start a 90-second rest timer for this set (v1 default: 90s)
    setSetRestTimers((prev) => ({
      ...prev,
      [setId]: { remaining: 90, total: 90 },
    }));
    // PB celebration (once per exercise) — compare against the prior all-time best.
    maybeCelebratePb(entryId, setId);
  };

  // Superset creation (v1 :1336): open the picker seeded with the source straight exercise.
  const handleOpenSupersetPicker = (entryId: string) => {
    const block = activeWorkout?.blocks.find(
      (b) => b.kind === 'straight' && b.exercises.some((e) => e.id === entryId),
    );
    if (block?.kind === 'straight') {
      const entry = block.exercises.find((e) => e.id === entryId);
      if (entry) {
        setSupersetSource({ entryId, name: entry.exerciseName });
      }
    }
  };

  // Other standalone straight exercises the source can pair with (v1 :6027 filter).
  const supersetCandidates = (activeWorkout?.blocks ?? [])
    .flatMap((b) =>
      b.kind === 'straight'
        ? b.exercises
            .filter((e) => e.id !== supersetSource?.entryId)
            .map((e) => ({ entryId: e.id, name: e.exerciseName, setCount: e.sets.length }))
        : [],
    );

  // v1-parity Add: chip bar (#82) — each chip creates a NEW typed block (or opens the
  // circuit/cardio picker) and opens the exercise picker. `addBlock` sets the new block
  // active, so the subsequent addExercise lands inside it (inheriting blockType, no prompt).
  const startTypedBlock = (blockType: StraightBlockType) => {
    addBlock(blockType);
    setShowAddExercise(true);
  };
  const openCircuitPicker = () => setShowAddBlock('circuit');
  const openCardioPicker = () => setShowAddCardio(true);

  // In-block "Add Exercise to Block" (v1 :4307-4323): target this block, open the picker.
  // No type prompt — addExercise appends to the active block, inheriting its blockType.
  const handleAddExerciseToBlock = (blockId: string) => {
    setActiveBlock(blockId);
    setShowAddExercise(true);
  };

  // Sets done {completed}/{total} across ALL blocks (cardio has no logged sets).
  // v1 active header counter (~2919-3060).
  const setsProgress = (activeWorkout?.blocks ?? []).reduce(
    (acc, block) => {
      for (const entry of entriesOfBlock(block)) {
        for (const s of entry.sets) {
          acc.total += 1;
          if (s.completed) acc.completed += 1;
        }
      }
      return acc;
    },
    { completed: 0, total: 0 },
  );

  // Rest control (v1 header pause/note/rest). Toggles the global 90s rest timer.
  const toggleRestTimer = () => {
    if (restTimer.isRunning) resetRestTimer();
    else startRestTimer(90);
  };

  // #83: assemble the optional PB/previous/volume badge props for one exercise entry
  // (v1 ~3900-3960). PB from personal_bests (normalized id), muscle from the library,
  // previous session from buildPreviousBests, today's volume computed live (G-13).
  const buildEntryBadges = (entry: ExerciseEntry): ExercisePBBadges => {
    const normId = normalizeExerciseId(entry.exerciseId);
    const pbItem = personalBests[normId];
    const primary = getExerciseById(entry.exerciseId)?.primaryMuscles?.[0];
    const prev = previousBests[entry.exerciseId];
    const prevLast = prev?.lastSets?.[prev.lastSets.length - 1];
    const prevWeight = prevLast?.weight ?? prev?.weight ?? null;
    const prevReps = prevLast?.reps ?? prev?.reps ?? null;
    return {
      pb: pbItem
        ? {
            bestWeight: pbItem.bestWeight,
            bestReps: pbItem.bestReps,
            oneRepMax: pbItem.oneRepMax,
            bestVolume: pbItem.bestVolume,
          }
        : undefined,
      todayVolume: entry.sets.reduce((a, s) => a + computeSetVolume(s), 0),
      muscleLabel: primary ? getMuscleDisplayName(primary as MuscleGroup) : undefined,
      previousDate: prev?.date ?? null,
      previousSummary:
        prevWeight != null && prevReps != null
          ? `${Math.abs(prevWeight)}×${prevReps}`
          : null,
    };
  };

  // Badge props keyed by entry.id — forwarded to straight/superset/circuit ExerciseCards.
  const badgesByEntryId: Record<string, ExercisePBBadges> = {};
  for (const block of activeWorkout?.blocks ?? []) {
    for (const e of entriesOfBlock(block)) badgesByEntryId[e.id] = buildEntryBadges(e);
  }

  const handleFinish = async () => {
    if (isFinishing) return;
    const durationSnapshot = workoutTimerSeconds;
    setShowSummary(true);
    const completed = await finishWorkout();
    if (completed) {
      // New-PR badges: compare the finished session against cached history (read-only).
      const pbs = detectNewPRs(
        { id: completed.id, performedAt: completed.performedAt, blocks: completed.blocks },
        historyRef.current,
        completed.userId,
      );
      const data = computeSummaryData(completed, durationSnapshot, { pbs });
      setSummaryData(data);

      // F1: Persist personal bests (fire-and-forget, don't block summary UI)
      void upsertPersonalBests(
        { id: completed.id, userId: completed.userId, performedAt: completed.performedAt, blocks: completed.blocks },
        historyRef.current,
      ).catch((err) => {
        console.error('[F1] failed to upsert personal bests:', err);
      });
    } else {
      setShowSummary(false);
      alert('Could not save workout. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Blue photo header panel (faithful port of v1 active header ~2919-3060):
          Minimize · Duration · pause/note/rest · Sets done · Finish. */}
      <div className="sticky top-0 z-20" data-testid="active-workout-header">
        <div className="relative overflow-hidden px-4 pt-10 pb-4">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${WORKOUT_HEADER_IMAGE})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-600/90 via-sky-600/85 to-sky-700/95" />
          <div className="relative">
            {/* Top row: Minimize · name · Finish */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => router.push('/today')}
                aria-label="Minimize workout"
                title="Minimize"
                className="p-2 -ml-1 rounded-xl bg-white/15 hover:bg-white/25 transition-colors backdrop-blur-sm"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
              <p className="flex-1 min-w-0 text-center font-semibold text-white truncate">
                {activeWorkout?.name || 'Workout'}
              </p>
              <Button
                onClick={handleFinish}
                disabled={isFinishing}
                className="bg-white text-sky-600 hover:bg-white/90 font-semibold"
              >
                {isFinishing ? 'Saving...' : 'Finish'}
              </Button>
            </div>

            {/* Duration */}
            <div className="mt-3 text-center">
              <p className="text-3xl font-bold text-white tabular-nums leading-none">
                {formatTime(workoutTimerSeconds)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-white/70">Duration</p>
            </div>

            {/* Controls: pause · note · rest */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => (timerRunning ? pauseWorkoutTimer() : resumeWorkoutTimer())}
                title={timerRunning ? 'Pause workout' : 'Resume workout'}
                aria-label={timerRunning ? 'Pause workout' : 'Resume workout'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-sm backdrop-blur-sm"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={() => setShowNotes((v) => !v)}
                aria-label="Workout note"
                aria-pressed={showNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-sm backdrop-blur-sm"
              >
                <StickyNote className="w-4 h-4" />
                Note
              </button>
              <button
                onClick={toggleRestTimer}
                aria-label="Rest timer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-sm backdrop-blur-sm"
              >
                <Timer className="w-4 h-4" />
                {restTimer.isRunning
                  ? `${Math.floor(restTimer.seconds / 60)}:${(restTimer.seconds % 60).toString().padStart(2, '0')}`
                  : 'Rest'}
              </button>
            </div>

            {/* Sets done counter */}
            <div className="mt-3 text-center">
              <span className="text-sm text-white/90" data-testid="sets-done-counter">
                Sets done{' '}
                <span className="font-bold text-white">
                  {setsProgress.completed}/{setsProgress.total}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Note panel (v1 header note control) */}
        {showNotes && (
          <div className="bg-white border-b border-gray-100 px-4 py-3">
            <Label htmlFor="workout-notes" className="text-xs text-gray-500">
              Workout note
            </Label>
            <textarea
              id="workout-notes"
              value={activeWorkout?.notes ?? ''}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              placeholder="How did this session feel?"
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        )}
      </div>

      {/* Add: coloured chip bar (v1 ~3100-3155). Each chip creates a NEW typed block
          (Warm-Up/Strength → straight; Circuit/Cardio → their pickers) — v1 parity. */}
      <div className="border-b border-gray-100 px-4 py-3" data-testid="add-chip-bar">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-xs font-medium text-gray-500">Add:</span>
          <button
            onClick={() => startTypedBlock('warmup')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-600 hover:bg-yellow-500/20 transition-colors"
          >
            <Flame className="w-4 h-4" /> Warm-Up
          </button>
          <button
            onClick={() => startTypedBlock('strength')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-500/20 transition-colors"
          >
            <Dumbbell className="w-4 h-4" /> Strength
          </button>
          <button
            onClick={openCircuitPicker}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-500/20 transition-colors"
          >
            <Zap className="w-4 h-4" /> Circuit
          </button>
          <button
            onClick={openCardioPicker}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-500/20 transition-colors"
          >
            <Heart className="w-4 h-4" /> Cardio
          </button>
        </div>
      </div>

      {/* Block list */}
      <div className="divide-y divide-gray-100">
        {activeWorkout?.blocks.map((block) => {
          if (block.kind === 'straight') {
            return (
              <StraightBlockCard
                key={block.id}
                block={block}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onCompleteSet={handleCompleteSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onRemoveBlock={removeBlock}
                onAddExerciseToBlock={handleAddExerciseToBlock}
                onCreateSuperset={handleOpenSupersetPicker}
                onAddDropSet={addDropSet}
                onUpdateDrop={updateDrop}
                onRemoveDrop={removeDrop}
                restTimers={setRestTimers}
                badgesByEntryId={badgesByEntryId}
              />
            );
          }
          if (block.kind === 'cardio') {
            return (
              <CardioCard
                key={block.id}
                block={block}
                onUpdateCardio={updateCardio}
                onRemoveBlock={removeBlock}
              />
            );
          }
          if (block.kind === 'superset') {
            return (
              <SupersetCard
                key={block.id}
                block={block}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onCompleteSet={handleCompleteSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onRemoveBlock={removeBlock}
                onAddDropSet={addDropSet}
                onUpdateDrop={updateDrop}
                onRemoveDrop={removeDrop}
                restTimers={setRestTimers}
                badgesByEntryId={badgesByEntryId}
              />
            );
          }
          if (block.kind === 'circuit') {
            return (
              <CircuitCard
                key={block.id}
                block={block}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onCompleteSet={handleCompleteSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onRemoveBlock={removeBlock}
                onAddRound={addRound}
                restTimers={setRestTimers}
                badgesByEntryId={badgesByEntryId}
              />
            );
          }
          return null;
        })}
      </div>

      {showAddExercise && (
        <AddExerciseModal
          onAdd={(ex) => {
            addExercise(ex);
            setShowAddExercise(false);
          }}
          onClose={() => setShowAddExercise(false)}
          userId={user?.id}
        />
      )}

      {showAddCardio && (
        <AddCardioModal
          onAdd={(params) => {
            addCardioBlock(params);
            setShowAddCardio(false);
          }}
          onClose={() => setShowAddCardio(false)}
          userId={user?.id}
        />
      )}

      {supersetSource && (
        <SupersetPicker
          sourceName={supersetSource.name}
          candidates={supersetCandidates}
          onPick={(targetEntryId) => {
            createSuperset(supersetSource.entryId, targetEntryId);
            setSupersetSource(null);
          }}
          onClose={() => setSupersetSource(null)}
        />
      )}

      {showAddBlock === 'circuit' && (
        <AddBlockModal
          mode="circuit"
          onAdd={(exercises, params) => {
            addCircuitBlock({
              stations: exercises,
              rounds: params?.rounds ?? 3,
              restSeconds: params?.restSeconds,
            });
            setShowAddBlock(false);
          }}
          onClose={() => setShowAddBlock(false)}
          userId={user?.id}
        />
      )}

      {/* Toast host — /workout/active is outside the (app) group, so it has no Toaster.
          Mount one here for the PB celebration (sonner). */}
      <Toaster />
    </div>
  );
}

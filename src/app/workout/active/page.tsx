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
import { Plus, Heart, Flame, Dumbbell, Zap, Link2, Pause, Play } from 'lucide-react';
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
import { ExerciseCard } from '@/features/workout-engine/components/ExerciseCard';
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
import { detectNewPRs, buildPreviousBests } from '@/features/workout-engine/lib/history-stats';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { upsertPersonalBests } from '@/features/workout-engine/api/upsert-personal-bests';
import { getExerciseAnimationUrl } from '@/lib/exerciseAnimations';

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

// Block-type picker — the single "+" entry point (faithful port of v1 active/page.tsx:5269).
// 2×2 colour-coded tiles: Warm-Up / Strength / Circuit / Cardio. In the v2 logged model
// there is no distinct "warmup" kind, so Warm-Up + Strength both open the straight-exercise
// picker (DQ-1 union: straight/superset/circuit/cardio). Circuit + Cardio open their pickers.
function BlockTypePicker({
  onPickStraight,
  onPickCircuit,
  onPickCardio,
  onClose,
}: {
  onPickStraight: () => void;
  onPickCircuit: () => void;
  onPickCardio: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-label="Add block"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-gray-900">Add Block</h3>
        <p className="text-sm text-gray-500 mb-4">Choose a block type to add exercises to</p>
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            onClick={onPickStraight}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-yellow-400 inline-flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-yellow-600">Warm-Up</span>
          </button>
          <button
            onClick={onPickStraight}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-blue-500 inline-flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-blue-600">Strength</span>
          </button>
          <button
            onClick={onPickCircuit}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-orange-400 inline-flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-orange-600">Circuit</span>
          </button>
          <button
            onClick={onPickCardio}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-rose-400 inline-flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-rose-600">Cardio</span>
          </button>
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
  // Single "+" entry point → v1 2×2 block-type picker (AC #3).
  const [showBlockTypePicker, setShowBlockTypePicker] = useState(false);
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
        setPreviousBests(buildPreviousBests(hist));
      })
      .catch(() => {
        /* history is best-effort; the Previous column just stays blank */
      });
    return () => {
      cancelled = true;
    };
  }, [user, setPreviousBests]);

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

  // B1: Wrap completeSet to start per-set rest timer (ported from v1)
  const handleCompleteSet = (entryId: string, setId: string) => {
    completeSet(entryId, setId);
    // Start a 90-second rest timer for this set (v1 default: 90s)
    setSetRestTimers((prev) => ({
      ...prev,
      [setId]: { remaining: 90, total: 90 },
    }));
  };

  // Superset creation (v1 :1336): open the picker seeded with the source straight exercise.
  const handleOpenSupersetPicker = (entryId: string) => {
    const block = activeWorkout?.blocks.find(
      (b) => b.kind === 'straight' && b.exercise.id === entryId,
    );
    if (block?.kind === 'straight') {
      setSupersetSource({ entryId, name: block.exercise.exerciseName });
    }
  };

  // Other standalone straight exercises the source can pair with (v1 :6027 filter).
  const supersetCandidates = (activeWorkout?.blocks ?? [])
    .map((b) =>
      b.kind === 'straight' && b.exercise.id !== supersetSource?.entryId
        ? { entryId: b.exercise.id, name: b.exercise.exerciseName, setCount: b.exercise.sets.length }
        : null,
    )
    .filter((c): c is { entryId: string; name: string; setCount: number } => c !== null);

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
      {/* Header: workout name + timer + pause + finish button (B1: added pause) */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium text-gray-900">
              {activeWorkout?.name || 'Workout'}
            </p>
            <p className="text-xs text-gray-500">{formatTime(workoutTimerSeconds)}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* B1: Pause/Resume button (ported from v1) */}
            <Button
              onClick={() => (timerRunning ? pauseWorkoutTimer() : resumeWorkoutTimer())}
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700"
              title={timerRunning ? 'Pause workout' : 'Resume workout'}
            >
              {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button
              onClick={handleFinish}
              disabled={isFinishing}
              className="bg-sky-500 text-white"
            >
              {isFinishing ? 'Saving...' : 'Finish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Block list */}
      <div className="divide-y divide-gray-100">
        {activeWorkout?.blocks.map((block) => {
          if (block.kind === 'straight') {
            return (
              <ExerciseCard
                key={block.id}
                entry={block.exercise}
                onAddSet={addSet}
                onUpdateSet={updateSet}
                onCompleteSet={handleCompleteSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onCreateSuperset={handleOpenSupersetPicker}
                onAddDropSet={addDropSet}
                onUpdateDrop={updateDrop}
                onRemoveDrop={removeDrop}
                restTimers={setRestTimers}
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
              />
            );
          }
          return null;
        })}
      </div>

      {/* Single "+" entry point → v1 2×2 block-type picker (AC #3). */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowBlockTypePicker(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Block
        </Button>
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

      {showBlockTypePicker && (
        <BlockTypePicker
          onPickStraight={() => {
            setShowBlockTypePicker(false);
            setShowAddExercise(true);
          }}
          onPickCircuit={() => {
            setShowBlockTypePicker(false);
            setShowAddBlock('circuit');
          }}
          onPickCardio={() => {
            setShowBlockTypePicker(false);
            setShowAddCardio(true);
          }}
          onClose={() => setShowBlockTypePicker(false)}
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
    </div>
  );
}

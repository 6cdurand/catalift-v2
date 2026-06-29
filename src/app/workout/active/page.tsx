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
import { Plus, Layers, Repeat } from 'lucide-react';
import { exerciseLibrary } from '@/lib/exercises';
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
import { SupersetCard } from '@/features/workout-engine/components/SupersetCard';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { CircuitCard } from '@/features/workout-engine/components/CircuitCard';
import { useSession } from '@/features/auth';
import { shouldRedirectFromActiveWorkout } from './redirect-guard';

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
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-sm">{ex.name}</div>
              {ex.equipment && (
                <div className="text-xs text-gray-500">{ex.equipment}</div>
              )}
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

        {/* Selected exercises */}
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
                className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-0 ${
                  isSelected ? 'bg-sky-50' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-sm">{ex.name}</div>
                {ex.equipment && (
                  <div className="text-xs text-gray-500">{ex.equipment}</div>
                )}
              </button>
            );
          })}
          {!trimmed && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No exercises found
            </div>
          )}
        </div>

        {/* Circuit params */}
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
    startWorkout,
    addExercise,
    removeExercise,
    addSupersetBlock,
    addCircuitBlock,
    removeBlock,
    addRound,
    addSet,
    updateSet,
    completeSet,
    uncompleteSet,
    removeSet,
    finishWorkout,
  } = useActiveWorkoutStore();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState<'superset' | 'circuit' | false>(false);
  const [readyToRedirect, setReadyToRedirect] = useState(false);
  const workoutStartAttempted = useRef(false);

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
    showSummary: false,
    completedWorkoutData: null,
    isFinishing,
    hasHydrated,
  });

  useEffect(() => {
    // Only redirect after we've attempted to start a workout (avoids race where redirect fires before startWorkout)
    if (!loading && readyToRedirect) {
      if (redirect === 'auth') router.replace('/auth/login');
      if (redirect === 'workout') router.replace('/workout');
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

  if (loading || redirect !== null) return null;

  const handleFinish = async () => {
    if (isFinishing) return;
    const completed = await finishWorkout();
    if (completed) {
      router.push('/workout');
    } else {
      alert('Could not save workout. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header: workout name + timer + finish button */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium text-gray-900">
              {activeWorkout?.name || 'Workout'}
            </p>
            <p className="text-xs text-gray-500">{formatTime(workoutTimerSeconds)}</p>
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
                onCompleteSet={completeSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
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
                onCompleteSet={completeSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onRemoveBlock={removeBlock}
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
                onCompleteSet={completeSet}
                onUncompleteSet={uncompleteSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                onRemoveBlock={removeBlock}
                onAddRound={addRound}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Add block buttons */}
      <div className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddExercise(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Exercise
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowAddBlock('superset')}
          >
            <Layers className="w-4 h-4 mr-2" /> Add Superset
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowAddBlock('circuit')}
          >
            <Repeat className="w-4 h-4 mr-2" /> Add Circuit
          </Button>
        </div>
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

      {showAddBlock === 'superset' && (
        <AddBlockModal
          mode="superset"
          onAdd={(exercises) => {
            addSupersetBlock(exercises);
            setShowAddBlock(false);
          }}
          onClose={() => setShowAddBlock(false)}
          userId={user?.id}
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

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
import { Plus, Heart } from 'lucide-react';
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
import { CardioCard } from '@/features/workout-engine/components/CardioCard';
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
    : [...exerciseLibrary, ...customExercises];

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-sm">{ex.name}</div>
                  {ex.equipment && (
                    <div className="text-xs text-gray-500">{ex.equipment}</div>
                  )}
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
              Add Cardio
            </Button>
          )}
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
    addSet,
    updateSet,
    completeSet,
    uncompleteSet,
    removeSet,
    addCardioBlock,
    updateCardio,
    removeBlock,
    finishWorkout,
  } = useActiveWorkoutStore();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddCardio, setShowAddCardio] = useState(false);
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

      {/* Exercise list */}
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
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddCardio(true)}
        >
          <Heart className="w-4 h-4 mr-2" /> Add Cardio
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
    </div>
  );
}

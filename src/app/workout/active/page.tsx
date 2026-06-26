'use client';

// Active workout page \u2014 the straight-set execution screen (w2a, ported from v1 active/page.tsx).
// Auth guard, timer, exercise list, finish button. w2a: straight sets only; superset/circuit/cardio/rest-timer are later waves.

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { exerciseLibrary } from '@/lib/exercises';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { useActiveWorkoutStore } from '@/features/workout-engine/stores/active-workout-store';
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { ExerciseCard } from '@/features/workout-engine/components/ExerciseCard';
import { shouldRedirectFromActiveWorkout } from './redirect-guard';

// Minimal exercise picker stub (w2a: enough to pick an exercise and call addExercise)
// TODO: expand to full v1 modal (custom exercise creation, filters, etc.) in a later wave
function AddExerciseModal({
  onAdd,
  onClose,
}: {
  onAdd: (ex: { exerciseId: string; exerciseName: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filteredExercises, setFilteredExercises] = useState(exerciseLibrary);

  const handleSearch = (value: string) => {
    setSearch(value);
    const lower = value.toLowerCase().trim();
    if (!lower) {
      setFilteredExercises(exerciseLibrary);
    } else {
      setFilteredExercises(
        exerciseLibrary.filter((ex) => ex.name.toLowerCase().includes(lower))
      );
    }
  };

  const handleSelect = (ex: { id: string; name: string }) => {
    onAdd({ exerciseId: ex.id, exerciseName: ex.name });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Add Exercise</h3>
        <Input
          placeholder="Search exercises (e.g. Bench Press)"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded">
          {filteredExercises.slice(0, 20).map((ex) => (
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
          {filteredExercises.length === 0 && (
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
    finishWorkout,
  } = useActiveWorkoutStore();

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyToRedirect, setReadyToRedirect] = useState(false);
  const workoutStartAttempted = useRef(false);

  // Stub auth check (TODO: wire to real useSession hook)
  useEffect(() => {
    // For w2a: assume logged in (real auth is in auth/** which is Class B)
    const stubUser = { id: 'stub-user-id' };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stub auth for w2a; real useSession is Class B
    setUser(stubUser);
    setLoading(false);
  }, []);

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
        {activeWorkout?.blocks.map((block) =>
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

      {/* Add exercise button */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowAddExercise(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Exercise
        </Button>
      </div>

      {showAddExercise && (
        <AddExerciseModal
          onAdd={(ex) => {
            addExercise(ex);
            setShowAddExercise(false);
          }}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}

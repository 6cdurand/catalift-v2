'use client';

// Active workout page \u2014 the straight-set execution screen (w2a, ported from v1 active/page.tsx).
// Auth guard, timer, exercise list, finish button. w2a: straight sets only; superset/circuit/cardio/rest-timer are later waves.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
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

  const handleAdd = () => {
    if (search.trim()) {
      onAdd({ exerciseId: 'stub-exercise-id', exerciseName: search.trim() });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Add Exercise</h3>
        <Input
          placeholder="Exercise name (e.g. Bench Press)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAdd} className="flex-1 bg-sky-500 text-white">
            Add
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

  // Stub auth check (TODO: wire to real useSession hook)
  useEffect(() => {
    // For w2a: assume logged in (real auth is in auth/** which is Class B)
    const stubUser = { id: 'stub-user-id' };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stub auth for w2a; real useSession is Class B
    setUser(stubUser);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stub auth for w2a
    setLoading(false);
  }, []);

  const redirect = shouldRedirectFromActiveWorkout({
    isAuthenticated: !!user,
    activeWorkout,
    showSummary: false,
    completedWorkoutData: null,
    isFinishing,
    hasHydrated,
  });

  useEffect(() => {
    if (!loading) {
      if (redirect === 'auth') router.replace('/auth/login');
      if (redirect === 'workout') router.replace('/workout');
    }
  }, [redirect, router, loading]);

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

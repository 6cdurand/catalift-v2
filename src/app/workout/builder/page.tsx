'use client';

// Standalone (ad-hoc) workout builder — faithful port of v1 workout/builder/page.tsx.
// Composes existing v2 workout-engine components (DayBuilder, ExerciseEditDialog,
// BlockCard, ExerciseRow) and the shared exercise search. Sources data from existing
// v2 seams: trainer_clients (via fetchRoster) for client selection, workouts table
// for edit mode. Light shell (sky/rose tokens).
//
// Query-param contract (preserved from v1):
//   ?clientId=<id>   — preselect client
//   ?workoutId=<id>  — edit existing workout (from workouts table)
//   ?eventId=<id>    — calendar event link (FLAG: no scheduled_sessions seam in v2 yet)
//
// Class-B pieces flagged (NOT built):
//   - Save to workout library (no workout_library table in v2)
//   - Circuit library (no circuit_library table in v2)
//   - Load from library (same)
//   - Program selection dialog (cross-feature import; deferred)
//   - Assignment type (one-time/weekly/program) — scheduling feature, not builder
//   - Calendar event link (no scheduled_sessions / calendar_events table in v2)
//   - Session workout save (no session_workouts table in v2; save is a no-op stub)

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Clock, Users, Loader2, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { DayBuilder } from '@/features/workout-engine/components/DayBuilder';
import { ExerciseEditDialog } from '@/features/workout-engine/components/ExerciseEditDialog';
import { useSession } from '@/features/auth';
import { searchExercisesLite } from '@/lib/exerciseSearch';
import {
  estimateWorkoutLengthSeconds,
  type EstimatorExercise,
  type Tempo,
} from '@/lib/workoutEstimator';
import { fetchRoster } from '@/features/trainer-ops/api/roster';
import type { RosterClient } from '@/types/roster';
import type { BlockType } from '@/types';
import type { BuilderBlock, BuilderExercise } from '@/features/workout-engine/components/builder-types';
import { getBrowserClient } from '@/lib/supabase';

// ── Block ordering (ported from v1 L663-666) ──
const BLOCK_ORDER: Record<BlockType, number> = {
  warmup: 0,
  work: 1,
  cardio: 2,
  circuit: 3,
  cooldown: 4,
};

function sortBlocks(blocks: BuilderBlock[]): BuilderBlock[] {
  return [...blocks].sort((a, b) => (BLOCK_ORDER[a.type as BlockType] ?? 1) - (BLOCK_ORDER[b.type as BlockType] ?? 1));
}

function parseTempo(tempoStr?: string): Tempo | undefined {
  if (!tempoStr) return undefined;
  const digits = tempoStr.replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    return [parseInt(digits[0]), parseInt(digits[1]), parseInt(digits[2]), parseInt(digits[3])];
  }
  return undefined;
}

// ── Loading fallback ──
function BuilderLoading() {
  return (
    <div className="container mx-auto p-4 max-w-4xl flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sky-500" />
        <p className="text-gray-500">Loading workout builder…</p>
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense (useSearchParams requires it) ──
export default function WorkoutBuilderPage() {
  return (
    <Suspense fallback={<BuilderLoading />}>
      <WorkoutBuilderContent />
    </Suspense>
  );
}

function WorkoutBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const workoutId = searchParams.get('workoutId');
  // eventId is read but not sourced — no scheduled_sessions seam in v2 yet (FLAG)
  const eventId = searchParams.get('eventId');

  const { user, loading: sessionLoading } = useSession();

  // ── Client roster (v2 seam: trainer_clients via fetchRoster) ──
  const [clients, setClients] = useState<RosterClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchRoster()
      .then((roster) => {
        if (cancelled) return;
        setClients(roster);
        setClientsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[WorkoutBuilder] Failed to load roster:', err);
        setClientsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // ── Edit mode: load existing workout from workouts table (v2 seam) ──
  const [existingWorkout, setExistingWorkout] = useState<{ id: string; name: string | null; blocks: BuilderBlock[] } | null>(null);
  const [editLoading, setEditLoading] = useState(!!workoutId);
  const [workoutName, setWorkoutName] = useState('Custom Workout');
  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);

  useEffect(() => {
    if (!workoutId) return;
    let cancelled = false;
    const supabase = getBrowserClient();
    supabase
      .from('workouts')
      .select('id, name, exercises')
      .eq('id', workoutId)
      .single()
      .then((result: { data: { id: string; name: string | null; exercises: unknown } | null; error: unknown }) => {
        if (cancelled) return;
        setEditLoading(false);
        if (result.error || !result.data) {
          console.error('[WorkoutBuilder] Failed to load workout:', result.error);
          return;
        }
        const rawBlocks = Array.isArray(result.data.exercises) ? result.data.exercises as unknown as BuilderBlock[] : [];
        setExistingWorkout({ id: result.data.id, name: result.data.name, blocks: rawBlocks });
        if (result.data.name) {
          setWorkoutName(result.data.name);
        }
        if (rawBlocks.length > 0) {
          setBlocks(rawBlocks);
        }
      });
    return () => { cancelled = true; };
  }, [workoutId]);

  const isEditMode = !!existingWorkout;

  // ── Add exercise dialog state ──
  const [showAddExercise, setShowAddExercise] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // ── Exercise edit dialog state ──
  const [editingExercise, setEditingExercise] = useState<{ blockId: string; exercise: BuilderExercise } | null>(null);

  // ── Duration estimate (ported from v1 L527-585) ──
  const workoutEstimate = useMemo(() => {
    const exercises: EstimatorExercise[] = [];

    blocks.forEach((block) => {
      block.exercises.forEach((exercise) => {
        let reps = 10;
        const repsMatch = exercise.reps.match(/(\d+)(?:-(\d+))?/);
        if (repsMatch) {
          if (repsMatch[2]) {
            reps = Math.round((parseInt(repsMatch[1]) + parseInt(repsMatch[2])) / 2);
          } else {
            reps = parseInt(repsMatch[1]);
          }
        }

        const restMatch = exercise.rest.match(/(\d+)/);
        const restSecs = restMatch ? parseInt(restMatch[1]) : 90;

        const name = exercise.exerciseName.toLowerCase();
        let equipmentType: 'barbell' | 'machine' | 'cable' | 'dumbbell' | 'bodyweight' | 'other' = 'other';
        if (name.includes('barbell') || name.includes('bb ') || name.includes('deadlift') || name.includes('bench press') || name.includes('squat')) {
          equipmentType = 'barbell';
        } else if (name.includes('dumbbell') || name.includes('db ')) {
          equipmentType = 'dumbbell';
        } else if (name.includes('cable') || name.includes('pulldown') || name.includes('face pull')) {
          equipmentType = 'cable';
        } else if (name.includes('machine') || name.includes('smith') || name.includes('leg press') || name.includes('pec deck') || name.includes('hack')) {
          equipmentType = 'machine';
        } else if (name.includes('push-up') || name.includes('pull-up') || name.includes('dip') || name.includes('plank')) {
          equipmentType = 'bodyweight';
        }

        exercises.push({
          name: exercise.exerciseName,
          sets: exercise.sets,
          reps,
          restSeconds: restSecs,
          tempo: parseTempo(exercise.tempo),
          type: equipmentType,
        });
      });
    });

    return estimateWorkoutLengthSeconds(exercises);
  }, [blocks]);

  const estimatedDuration = Math.round(workoutEstimate.totalSeconds / 60);

  // ── Exercise search results for add-exercise dialog ──
  const filteredExercises = useMemo(() => {
    const currentBlock = blocks.find((b) => b.id === showAddExercise);
    return searchExercisesLite(exerciseSearch, {
      blockType: (currentBlock?.type as string) || null,
      limit: 30,
    });
  }, [exerciseSearch, showAddExercise, blocks]);

  // ── Block operations (ported from v1 L668-706) ──
  function addBlock(type: BlockType) {
    const newBlock: BuilderBlock = {
      id: `block-${crypto.randomUUID()}`,
      type,
      name: type === 'warmup' ? 'Warm-up' : type === 'cooldown' ? 'Cool-down' : type === 'circuit' ? 'Circuit' : 'Strength',
      exercises: [],
    };
    setBlocks(sortBlocks([...blocks, newBlock]));
  }

  function removeBlock(blockId: string) {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  }

  function updateBlockName(blockId: string, name: string) {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, name } : b)));
  }

  function addExerciseToBlock(blockId: string, exercise: { id: string; name: string; pattern: string }) {
    const newExercise: BuilderExercise = {
      id: `ex-${crypto.randomUUID()}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      movementPattern: exercise.pattern,
      sets: 3,
      reps: '8-12',
      rest: '90s',
      repType: 'reps',
      setStyle: 'fixed',
    };
    setBlocks(blocks.map((b) =>
      b.id === blockId ? { ...b, exercises: [...b.exercises, newExercise] } : b,
    ));
    setShowAddExercise(null);
    setExerciseSearch('');
  }

  function removeExercise(blockId: string, exerciseId: string) {
    setBlocks(blocks.map((b) =>
      b.id === blockId ? { ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) } : b,
    ));
  }

  function updateExercise(blockId: string, exerciseId: string, updates: Partial<BuilderExercise>) {
    setBlocks(blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            exercises: b.exercises.map((e) =>
              e.id === exerciseId ? { ...e, ...updates } : e,
            ),
          }
        : b,
    ));
  }

  function handleEditExercise(blockId: string, exerciseId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const exercise = block.exercises.find((e) => e.id === exerciseId);
    if (exercise) {
      setEditingExercise({ blockId, exercise });
    }
  }

  // ── Save (Class B — FLAG: no session_workouts table in v2) ──
  // The v1 builder saved to trainerStore.addSessionWorkout + linked to calendar event.
  // v2 has no session_workouts or calendar_events table. The save action shows a toast
  // indicating the workout was built but persistence is not yet available.
  function handleSave() {
    if (blocks.length === 0) return;
    // CLASS-B FLAG: Save to session_workouts table does not exist in v2 yet.
    // This is a placeholder — the builder UI is complete but persistence requires
    // a new table (Class B). Flagged in PR, not built.
    toast.info('Workout builder is ready. Save to session requires a new table (Class B — flagged in PR).');
    router.back();
  }

  if (sessionLoading || editLoading) {
    return <BuilderLoading />;
  }

  const totalExercises = blocks.reduce((acc, b) => acc + b.exercises.length, 0);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Workout' : 'Workout Builder'}
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="container mx-auto max-w-4xl p-4 pb-32">
        {/* Subtitle */}
        <p className="text-sm text-gray-500 mb-4">
          {isEditMode ? 'Modify the existing workout' : 'Create a one-off workout session'}
        </p>

        {/* Client Selection (v2 seam: trainer_clients via fetchRoster) */}
        <Card className="mb-4 bg-white border-gray-200">
          <CardContent className="p-4">
            <Label className="mb-3 block text-gray-700">Assign to Client</Label>
            {clientsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-gray-400">No clients found</p>
            ) : (
              <Select
                value={selectedClientId ?? ''}
                onValueChange={(v) => setSelectedClientId(v || null)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-500 shrink-0" />
                    <SelectValue placeholder="Select a client…" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-gray-900">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedClient && (
              <p className="text-xs text-gray-400 mt-2">{selectedClient.email}</p>
            )}
          </CardContent>
        </Card>

        {/* Workout Name & Duration */}
        <Card className="mb-4 bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label className="text-gray-700">Workout Name</Label>
                <Input
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Enter workout name…"
                  className="mt-2 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              {blocks.length > 0 && (
                <div className="text-right">
                  <Label className="text-gray-500">Est. Duration</Label>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-sky-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-lg font-semibold">{estimatedDuration}</span>
                    <span className="text-sm text-gray-500">min</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Workout Blocks — composed from existing v2 DayBuilder */}
        <div className="space-y-4 mb-4">
          <DayBuilder
            blocks={blocks}
            dayLabel={undefined}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onUpdateBlockName={updateBlockName}
            onAddExercise={(blockId) => setShowAddExercise(blockId)}
            onEditExercise={handleEditExercise}
            onRemoveExercise={removeExercise}
          />

          {/* Empty state with builder prompt */}
          {blocks.length === 0 && (
            <Card className="border-gray-200 bg-white">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Dumbbell className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Start building your workout</p>
                <p className="mt-1 text-xs text-gray-400">
                  Add a block above to begin (Warm-up, Strength, Circuit, Cardio, or Cool-down)
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Event link info (FLAG: no scheduled_sessions seam in v2) */}
        {eventId && (
          <Card className="mb-4 bg-sky-50 border-sky-200">
            <CardContent className="p-3">
              <p className="text-xs text-sky-700">
                <strong>Event link:</strong> eventId={eventId}. Calendar event linking is not yet available in v2 (no scheduled_sessions table). Flagged in PR.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Action Bar (ported from v1 L1117-1157, light shell) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4">
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <p className="text-xs sm:text-sm text-gray-500">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''} • {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
            </p>
            {blocks.length > 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-sky-50 rounded-lg border border-sky-200">
                <Clock className="h-4 w-4 text-sky-600" />
                <div className="text-sm">
                  <span className="font-semibold text-sky-600">~{estimatedDuration} min</span>
                  <span className="hidden sm:inline text-xs text-gray-500 ml-2">
                    ({Math.round(workoutEstimate.workSeconds / 60)}m work, {Math.round(workoutEstimate.restSeconds / 60)}m rest)
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleSave}
              size="lg"
              disabled={blocks.length === 0}
              className="flex-1 sm:flex-none bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" /> {isEditMode ? 'Update Workout' : 'Save Workout'}
            </Button>
          </div>
        </div>
      </div>

      {/* Exercise Edit Dialog (shared v2 component) */}
      {editingExercise && (
        <ExerciseEditDialog
          blockId={editingExercise.blockId}
          exercise={editingExercise.exercise}
          onSave={updateExercise}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {/* Add Exercise Dialog (ported from BuildDaysStep pattern) */}
      <Dialog open={!!showAddExercise} onOpenChange={() => { setShowAddExercise(null); setExerciseSearch(''); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search exercises (e.g. Bench Press)"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            autoFocus
            className="bg-white border-gray-200 text-gray-900"
          />
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExerciseToBlock(showAddExercise!, { id: ex.id, name: ex.name, pattern: ex.pattern })}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-sm text-gray-900">{ex.name}</div>
                <div className="text-xs text-gray-500 capitalize">{ex.pattern}</div>
              </button>
            ))}
            {filteredExercises.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No exercises found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

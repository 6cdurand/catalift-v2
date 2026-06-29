// BuildDaysStep.tsx — Program builder Step 2: Build Days (w2b-1)
// Ported from v1 program/builder/page.tsx L1153-1457 + WorkoutDayBuilder.
// Uses the w1 programs store as single source of truth for days state.

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, Plus, Copy, Trash2 } from 'lucide-react';
// eslint-disable-next-line no-restricted-imports -- builder step imports shared components from workout-engine
import { DayBuilder } from '@/features/workout-engine/components/DayBuilder';
// eslint-disable-next-line no-restricted-imports -- builder step imports shared ExerciseEditDialog from workout-engine
import { ExerciseEditDialog } from '@/features/workout-engine/components/ExerciseEditDialog';
import { useProgramsStore } from '../../store';
import { searchExercisesLite } from '@/lib/exerciseSearch';
import type { BlockType } from '@/types';
import type { ProgramExercise } from '../../types';

interface BuildDaysStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function BuildDaysStep({ onContinue, onBack }: BuildDaysStepProps) {
  const {
    builderDays: days,
    activeDayIndex,
    setActiveDayIndex,
    updateDayLabel,
    addDay,
    copyDay,
    removeDay,
    addBlock,
    removeBlock,
    updateBlockName,
    addExerciseToBlock,
    removeExercise,
    updateExercise,
  } = useProgramsStore();

  const [showAddExercise, setShowAddExercise] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [editingExercise, setEditingExercise] = useState<{ blockId: string; exercise: ProgramExercise } | null>(null);

  const activeDay = days[activeDayIndex];

  const totalBlocks = activeDay?.blocks.length || 0;
  const totalExercises = activeDay?.blocks.reduce((s, b) => s + b.exercises.length, 0) || 0;
  const allDaysTotalEx = days.reduce((s, d) => s + d.blocks.reduce((s2, b) => s2 + b.exercises.length, 0), 0);

  const filteredExercises = useMemo(() => {
    const currentBlock = activeDay?.blocks.find((b) => b.id === showAddExercise);
    return searchExercisesLite(exerciseSearch, {
      blockType: (currentBlock?.type as string) || null,
      limit: 30,
    });
  }, [exerciseSearch, showAddExercise, activeDay]);

  const handleAddExercise = (exercise: { id: string; name: string; pattern: string }) => {
    if (showAddExercise) {
      addExerciseToBlock(showAddExercise, exercise);
    }
    setShowAddExercise(null);
    setExerciseSearch('');
  };

  const handleEditExercise = (blockId: string, exerciseId: string) => {
    for (const day of days) {
      const block = day.blocks.find((b) => b.id === blockId);
      if (block) {
        const ex = block.exercises.find((e) => e.id === exerciseId);
        if (ex) {
          setEditingExercise({ blockId, exercise: ex });
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => setActiveDayIndex(i)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              i === activeDayIndex
                ? 'bg-sky-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {day.label}
          </button>
        ))}
        <button
          onClick={addDay}
          className="px-2 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          title="Add day"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Day name + actions */}
      {activeDay && (
        <div className="flex items-center gap-2">
          <Input
            value={activeDay.label}
            onChange={(e) => updateDayLabel(activeDayIndex, e.target.value)}
            className="flex-1"
            placeholder="Day name"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyDay(activeDayIndex)}
            title="Copy day"
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeDay(activeDayIndex)}
            disabled={days.length <= 1}
            title="Remove day"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* DayBuilder */}
      {activeDay && (
        <DayBuilder
          blocks={activeDay.blocks as never}
          dayLabel={undefined}
          onAddBlock={(type: BlockType) => addBlock(activeDayIndex, type)}
          onRemoveBlock={removeBlock}
          onUpdateBlockName={updateBlockName}
          onAddExercise={(blockId) => setShowAddExercise(blockId)}
          onEditExercise={handleEditExercise}
          onRemoveExercise={removeExercise}
        />
      )}

      {/* Bottom bar */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {totalBlocks} blocks • {totalExercises} exercises
        </span>
        <span className="text-xs text-gray-400">
          {allDaysTotalEx} total across {days.length} days
        </span>
      </div>

      {/* Step nav */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Setup
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Continue to Schedule <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Exercise Edit Dialog (w2b-2) */}
      {editingExercise && (
        <ExerciseEditDialog
          blockId={editingExercise.blockId}
          exercise={editingExercise.exercise}
          onSave={(blockId, exerciseId, updates) => updateExercise(blockId, exerciseId, updates as Partial<ProgramExercise>)}
          onClose={() => setEditingExercise(null)}
        />
      )}

      {/* Add Exercise Dialog */}
      <Dialog open={!!showAddExercise} onOpenChange={() => { setShowAddExercise(null); setExerciseSearch(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search exercises (e.g. Bench Press)"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleAddExercise({ id: ex.id, name: ex.name, pattern: ex.pattern })}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="text-xs text-gray-500">{ex.pattern}</div>
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

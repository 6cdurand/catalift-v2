// SupersetCard.tsx — thin wrapper that renders one ExerciseCard per entry in a superset block (w2b).
// Reuses ExerciseCard/SetRow unchanged; passes store callbacks straight through.

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ExerciseCard } from './ExerciseCard';
import type { WorkoutBlock, ExerciseEntry, LoggedSet } from '../types';

interface SupersetCardProps {
  block: Extract<WorkoutBlock, { kind: 'superset' }>;
  onAddSet: (entryId: string) => void;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
  onRemoveExercise: (entryId: string) => void;
  onRemoveBlock: (blockId: string) => void;
}

export function SupersetCard({
  block,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onRemoveBlock,
}: SupersetCardProps) {
  return (
    <div className="border-l-4 border-sky-400 bg-sky-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-sky-50/50 border-b border-sky-100">
        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Superset</Badge>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemoveBlock(block.id)}
          className="h-8 w-8 text-gray-500 hover:text-red-400"
          title="Remove superset block"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Entries */}
      <div className="divide-y divide-gray-100">
        {block.exercises.map((entry: ExerciseEntry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            onAddSet={onAddSet}
            onUpdateSet={onUpdateSet}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemoveSet={onRemoveSet}
            onRemoveExercise={onRemoveExercise}
          />
        ))}
      </div>
    </div>
  );
}

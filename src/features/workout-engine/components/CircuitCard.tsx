// CircuitCard.tsx — thin wrapper that renders one ExerciseCard per station in a circuit block (w2b).
// Reuses ExerciseCard/SetRow unchanged; hides per-entry "Add Set" in favour of "Add Round" footer.

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { ExerciseCard } from './ExerciseCard';
import type { WorkoutBlock, ExerciseEntry, LoggedSet } from '../types';

interface CircuitCardProps {
  block: Extract<WorkoutBlock, { kind: 'circuit' }>;
  onAddSet: (entryId: string) => void;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
  onRemoveExercise: (entryId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onAddRound: (circuitBlockId: string) => void;
}

export function CircuitCard({
  block,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onRemoveBlock,
  onAddRound,
}: CircuitCardProps) {
  return (
    <div className="border-l-4 border-orange-400 bg-orange-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-orange-50/50 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Circuit</Badge>
          <span className="text-xs text-gray-600">{block.rounds} rounds</span>
          {block.restSeconds != null && (
            <span className="text-xs text-gray-500">{block.restSeconds}s rest</span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemoveBlock(block.id)}
          className="h-8 w-8 text-gray-500 hover:text-red-400"
          title="Remove circuit block"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Stations */}
      <div className="divide-y divide-gray-100">
        {block.stations.map((entry: ExerciseEntry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            onAddSet={onAddSet}
            onUpdateSet={onUpdateSet}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemoveSet={onRemoveSet}
            onRemoveExercise={onRemoveExercise}
            hideAddSet
          />
        ))}
      </div>

      {/* Add Round footer */}
      <div className="p-2 border-t border-orange-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddRound(block.id)}
          className="w-full text-xs text-gray-500 hover:text-orange-500 h-8"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Round
        </Button>
      </div>
    </div>
  );
}

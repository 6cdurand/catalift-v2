// DayBuilder.tsx — renders the blocks for a single day.
// Ported from v1 WorkoutDayBuilder (L920-1119): add-block row, block list, empty state.
// Receives blocks + callbacks; does NOT manage day index or next-day logic.
// The rich Exercise-Edit dialog (w2b-2) is rendered by the parent builder via onEditExercise.

'use client';

import { Button } from "@/components/ui/button";
import { BlockCard } from "./BlockCard";
import { BLOCK_TYPES } from "./block-types";
import type { BuilderBlock } from "./builder-types";
import type { BlockType } from "@/types";

interface DayBuilderProps {
  blocks: BuilderBlock[];
  dayLabel?: string;
  onAddBlock: (type: BlockType) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlockName: (blockId: string, name: string) => void;
  onAddExercise: (blockId: string) => void;
  onEditExercise: (blockId: string, exerciseId: string) => void;
  onRemoveExercise: (blockId: string, exerciseId: string) => void;
}

export function DayBuilder({
  blocks,
  dayLabel,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlockName,
  onAddExercise,
  onEditExercise,
  onRemoveExercise,
}: DayBuilderProps) {
  return (
    <div className="space-y-4">
      {dayLabel && (
        <div className="text-sm font-medium text-gray-700">{dayLabel}</div>
      )}

      {/* Add Block row */}
      <div className="flex gap-1 flex-wrap items-center">
        <span className="text-xs text-gray-500 mr-1">Add Block:</span>
        {BLOCK_TYPES.map((bt) => (
          <Button
            key={bt.value}
            variant="outline"
            size="sm"
            onClick={() => onAddBlock(bt.value)}
            className="h-7 text-xs gap-1"
          >
            {bt.icon}
            {bt.label}
          </Button>
        ))}
      </div>

      {/* Blocks */}
      {blocks.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No blocks yet</p>
          <p className="text-xs mt-1">Add a block above to start building this day</p>
        </div>
      )}

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          onRemoveBlock={() => onRemoveBlock(block.id)}
          onUpdateBlockName={(name) => onUpdateBlockName(block.id, name)}
          onAddExercise={() => onAddExercise(block.id)}
          onEditExercise={(exerciseId) => onEditExercise(block.id, exerciseId)}
          onRemoveExercise={(exerciseId) => onRemoveExercise(block.id, exerciseId)}
        />
      ))}
    </div>
  );
}

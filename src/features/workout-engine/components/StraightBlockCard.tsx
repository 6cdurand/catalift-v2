// StraightBlockCard.tsx — v1-parity grouped block card for TYPED straight blocks.
// A straight block is a coloured, titled container (warmup=yellow/Flame,
// strength=blue/Dumbbell, cooldown=purple) that holds MANY exercises. It wraps the
// existing ExerciseCard per exercise (keeping superset/drop-set actions + PB badges),
// and offers an in-block "Add Exercise" button that inherits the block's type — no
// type prompt (v1 active/page.tsx :3258-3293 header + :4307-4323 add-to-block).

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseCard, type ExercisePBBadges } from './ExerciseCard';
import { BlockMenu } from './BlockMenu';
import { getStraightBlockStyles, getStraightBlockLabel } from './block-types';
import type { WorkoutBlock, ExerciseEntry, LoggedSet, DropSet } from '../types';

interface StraightBlockCardProps {
  block: Extract<WorkoutBlock, { kind: 'straight' }>;
  onAddSet: (entryId: string) => void;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
  onRemoveExercise: (entryId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  /** In-block "Add Exercise": set this block active, then open the picker (no type prompt). */
  onAddExerciseToBlock: (blockId: string) => void;
  onCreateSuperset?: (sourceEntryId: string) => void;
  onAddDropSet?: (entryId: string) => void;
  onUpdateDrop?: (entryId: string, setId: string, dropId: string, updates: Partial<DropSet>) => void;
  onRemoveDrop?: (entryId: string, setId: string, dropId: string) => void;
  restTimers?: Record<string, { remaining: number; total: number }>;
  /** Optional PB/previous/volume badges per exercise (keyed by entry.id). Forwarded to each ExerciseCard. */
  badgesByEntryId?: Record<string, ExercisePBBadges>;
}

export function StraightBlockCard({
  block,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onRemoveBlock,
  onAddExerciseToBlock,
  onCreateSuperset,
  onAddDropSet,
  onUpdateDrop,
  onRemoveDrop,
  restTimers,
  badgesByEntryId,
}: StraightBlockCardProps) {
  const styles = getStraightBlockStyles(block.blockType);
  const label = getStraightBlockLabel(block.blockType);
  const exerciseCount = block.exercises.length;

  const handleSaveToLibrary = () => {
    // TODO: wire to saved_blocks seam (saveBlock from programs/api/blocks)
    // Requires converting WorkoutBlock → ProgramBlock — out of scope for this port.
  };

  return (
    <div className={cn('rounded-xl border-2', styles.border, styles.bg)} data-testid="straight-block-card">
      {/* Header (v1 :3258-3293): chip icon + typed title + exercise count + menu */}
      <div className={cn('flex items-center justify-between p-3 border-b', styles.border)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-5 h-5 rounded-full inline-flex items-center justify-center', styles.chipBg)}>
            {styles.chipIcon}
          </span>
          <div>
            <h3 className={cn('font-semibold', styles.text)}>{label}</h3>
            <p className="text-xs text-gray-500">
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              {exerciseCount === 0 && ' • Add exercises below'}
            </p>
          </div>
        </div>

        <BlockMenu
          hasExercises={exerciseCount > 0}
          onDelete={() => onRemoveBlock(block.id)}
          onSaveToLibrary={handleSaveToLibrary}
        />
      </div>

      {/* Exercises */}
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
            onCreateSuperset={onCreateSuperset}
            onAddDropSet={onAddDropSet}
            onUpdateDrop={onUpdateDrop}
            onRemoveDrop={onRemoveDrop}
            restTimers={restTimers}
            {...(badgesByEntryId?.[entry.id] ?? {})}
          />
        ))}
      </div>

      {/* In-block "Add Exercise" (v1 :4307-4323): inherits the block's type — no prompt. */}
      <div className={cn('p-2 border-t', styles.border)}>
        <button
          onClick={() => onAddExerciseToBlock(block.id)}
          className={cn(
            'w-full flex items-center justify-center gap-1 rounded-md py-2 text-xs font-medium transition-colors hover:bg-white/50',
            styles.text,
          )}
        >
          <Plus className="w-3 h-3" /> Add Exercise to Block
        </button>
      </div>
    </div>
  );
}

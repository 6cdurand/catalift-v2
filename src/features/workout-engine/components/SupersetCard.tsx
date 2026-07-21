// SupersetCard.tsx — v1-fidelity block card for superset blocks (w2b → fidelity port).
// Rounded-xl border-2 card with per-type tint, chip icon, name, subtitle, 3-dot dropdown.
// Reuses ExerciseCard/SetRow unchanged; passes store callbacks straight through.

import { cn } from '@/lib/utils';
import { ExerciseCard, type ExercisePBBadges } from './ExerciseCard';
import { BlockMenu } from './BlockMenu';
import { getBlockStylesFromKind } from './block-types';
import type { WorkoutBlock, ExerciseEntry, LoggedSet, DropSet } from '../types';

interface SupersetCardProps {
  block: Extract<WorkoutBlock, { kind: 'superset' }>;
  onAddSet: (entryId: string) => void;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
  onRemoveExercise: (entryId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  /** Drop-set actions (v1 :1322/:6383) — grouped exercises can carry drops too. */
  onAddDropSet?: (entryId: string) => void;
  onUpdateDrop?: (entryId: string, setId: string, dropId: string, updates: Partial<DropSet>) => void;
  onRemoveDrop?: (entryId: string, setId: string, dropId: string) => void;
  restTimers?: Record<string, { remaining: number; total: number }>;
  /** Optional PB/previous/volume badges per grouped entry (keyed by entry.id). Forwarded to each ExerciseCard. */
  badgesByEntryId?: Record<string, ExercisePBBadges>;
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
  onAddDropSet,
  onUpdateDrop,
  onRemoveDrop,
  restTimers,
  badgesByEntryId,
}: SupersetCardProps) {
  const styles = getBlockStylesFromKind(block.kind);
  const exerciseCount = block.exercises.length;

  const handleSaveToLibrary = () => {
    // TODO: wire to saved_blocks seam (saveBlock from programs/api/blocks)
    // Requires converting WorkoutBlock → ProgramBlock — out of scope for look-fidelity port.
  };

  return (
    <div className={cn('rounded-xl border-2', styles.border, styles.bg)}>
      {/* Header */}
      <div className={cn('flex items-center justify-between p-3 border-b', styles.border)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-5 h-5 rounded-full inline-flex items-center justify-center', styles.chipBg)}>
            {styles.chipIcon}
          </span>
          <div>
            <h3 className={cn('font-semibold', styles.text)}>Superset</h3>
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
            onAddDropSet={onAddDropSet}
            onUpdateDrop={onUpdateDrop}
            onRemoveDrop={onRemoveDrop}
            restTimers={restTimers}
            {...(badgesByEntryId?.[entry.id] ?? {})}
          />
        ))}
      </div>
    </div>
  );
}

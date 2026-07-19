// ExerciseCard.tsx \u2014 exercise header + sets list + Add Set button (w2a, ported from v1 active/page.tsx:3822-3841).

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Link2, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { SetRow } from './SetRow';
import { getExerciseAnimationUrl } from '@/lib/exerciseAnimations';
import type { DropSet, ExerciseEntry, LoggedSet } from '../types';

interface ExerciseCardProps {
  entry: ExerciseEntry;
  onAddSet: (entryId: string) => void;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
  onRemoveExercise: (entryId: string) => void;
  /** Drop-set actions (v1 :1322/:6383). When provided, an actions menu offers "Add Drop Set". */
  onAddDropSet?: (entryId: string) => void;
  onUpdateDrop?: (entryId: string, setId: string, dropId: string, updates: Partial<DropSet>) => void;
  onRemoveDrop?: (entryId: string, setId: string, dropId: string) => void;
  /** Superset creation (v1 :1336). When provided, an actions menu offers "Create Superset". */
  onCreateSuperset?: (sourceEntryId: string) => void;
  hideAddSet?: boolean;
  /** Per-set rest timers keyed by setId (Fix B). Passed straight through to SetRow. */
  restTimers?: Record<string, { remaining: number; total: number }>;
}

export function ExerciseCard({
  entry,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
  onRemoveExercise,
  onAddDropSet,
  onUpdateDrop,
  onRemoveDrop,
  onCreateSuperset,
  hideAddSet = false,
  restTimers,
}: ExerciseCardProps) {
  const showActionsMenu = Boolean(onCreateSuperset || onAddDropSet);
  const completedCount = entry.sets.filter((s) => s.completed).length;
  const totalCount = entry.sets.length;

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {(() => {
              const thumb = getExerciseAnimationUrl(entry.exerciseId);
              // Fallback (v1 active/page.tsx:4941): no image box, just the name.
              if (!thumb) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element -- animated GIF thumbnail; next/image breaks GIF animation
                <img
                  src={thumb}
                  alt=""
                  aria-hidden="true"
                  className="w-10 h-10 rounded-md object-cover bg-gray-100 shrink-0"
                />
              );
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-900 truncate">{entry.exerciseName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              {completedCount}/{totalCount}
            </Badge>
            {showActionsMenu ? (
              // Exercise actions menu (faithful port of v1 active/page.tsx:3866-3910):
              // Create Superset + Add Drop Set + Remove Exercise.
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700"
                    aria-label="Exercise actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-lg">
                  {onCreateSuperset && (
                    <DropdownMenuItem
                      className="text-blue-500 focus:text-blue-600"
                      onClick={() => onCreateSuperset(entry.id)}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Create Superset
                    </DropdownMenuItem>
                  )}
                  {onAddDropSet && (
                    <DropdownMenuItem
                      className="text-orange-500 focus:text-orange-600"
                      onClick={() => onAddDropSet(entry.id)}
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Add Drop Set
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="text-red-500 focus:text-red-600"
                    onClick={() => onRemoveExercise(entry.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Exercise
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemoveExercise(entry.id)}
                className="h-8 w-8 text-gray-500 hover:text-red-400"
                title="Remove exercise"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sets header */}
      <div className="grid grid-cols-12 gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-50 text-[10px] sm:text-xs text-gray-500 font-medium">
        <div className="col-span-1">SET</div>
        <div className="col-span-3">PREVIOUS</div>
        <div className="col-span-3 text-center">KG</div>
        <div className="col-span-3 text-center">REPS</div>
        <div className="col-span-2" />
      </div>

      {/* Set rows */}
      <div className="divide-y divide-gray-100">
        {entry.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            entryId={entry.id}
            onUpdateSet={onUpdateSet}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemoveSet={onRemoveSet}
            onUpdateDrop={onUpdateDrop}
            onRemoveDrop={onRemoveDrop}
            restRemaining={restTimers?.[set.id]?.remaining}
          />
        ))}
      </div>

      {/* Add Set button */}
      {!hideAddSet && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddSet(entry.id)}
          className="w-full text-xs text-gray-500 hover:text-sky-500 h-8"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Set
        </Button>
      )}
    </div>
  );
}

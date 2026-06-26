// SetRow.tsx \u2014 a single set row (w2a, ported from v1 active/page.tsx:4047-4198).
// Renders set number, previous tap-to-fill, weight/reps inputs, complete/undo button, per-set volume.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoggedSet } from '../types';

interface SetRowProps {
  set: LoggedSet;
  entryId: string;
  onUpdateSet: (entryId: string, setId: string, updates: Partial<LoggedSet>) => void;
  onCompleteSet: (entryId: string, setId: string) => void;
  onUncompleteSet: (entryId: string, setId: string) => void;
  onRemoveSet: (entryId: string, setId: string) => void;
}

export function SetRow({
  set,
  entryId,
  onUpdateSet,
  onCompleteSet,
  onUncompleteSet,
  onRemoveSet,
}: SetRowProps) {
  const previousDisplay =
    set.previousWeight != null && set.previousReps != null
      ? `${Math.abs(set.previousWeight)}×${set.previousReps}`
      : '—';

  return (
    <div className="px-2 sm:px-4 py-2">
      <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center text-xs sm:text-sm">
        {/* Set Number */}
        <div className="col-span-1 text-gray-500 font-medium">{set.setNumber}</div>

        {/* Previous \u2014 tap to fill */}
        <div className="col-span-3">
          {previousDisplay !== '—' ? (
            <div className="flex flex-col items-start">
              <button
                onClick={() => {
                  if (
                    !set.completed &&
                    set.previousWeight != null &&
                    set.previousReps != null
                  ) {
                    onUpdateSet(entryId, set.id, {
                      weight: Math.abs(set.previousWeight),
                      reps: set.previousReps,
                    });
                  }
                }}
                disabled={set.completed}
                className="text-xs text-sky-500 hover:text-sky-400 active:scale-95 transition-all disabled:text-gray-500 disabled:cursor-default"
                title="Tap to fill"
              >
                {previousDisplay}
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </div>

        {/* Weight Input */}
        <div className="col-span-3">
          <Input
            type="number"
            inputMode="decimal"
            pattern="[0-9.]*"
            placeholder={
              set.previousWeight != null ? String(Math.abs(set.previousWeight)) : '0'
            }
            min="0"
            step="any"
            value={set.weight != null && set.weight !== undefined ? set.weight : ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateSet(entryId, set.id, { weight: null });
              } else {
                onUpdateSet(entryId, set.id, { weight: parseFloat(val) });
              }
            }}
            disabled={set.completed}
            className={cn(
              'min-h-[44px] h-8 sm:h-9 text-center text-xs sm:text-sm bg-gray-50 border-gray-200 px-1',
              set.completed && 'opacity-50',
              set.weight == null &&
                set.previousWeight != null &&
                'placeholder:text-sky-300'
            )}
          />
        </div>

        {/* Reps Input */}
        <div className="col-span-3">
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={set.previousReps != null ? String(set.previousReps) : '0'}
            min="0"
            value={set.reps != null && set.reps !== undefined ? set.reps : ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateSet(entryId, set.id, { reps: null });
              } else {
                onUpdateSet(entryId, set.id, { reps: parseInt(val, 10) });
              }
            }}
            disabled={set.completed}
            className={cn(
              'min-h-[44px] h-8 sm:h-9 text-center text-xs sm:text-sm bg-gray-50 border-gray-200 px-1',
              set.completed && 'opacity-50',
              set.reps == null && set.previousReps != null && 'placeholder:text-sky-300'
            )}
          />
        </div>

        {/* Complete Button */}
        <div className="col-span-2 flex justify-end items-center gap-1">
          {!set.completed ? (
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemoveSet(entryId, set.id)}
                className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                title="Delete set"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onCompleteSet(entryId, set.id)}
                disabled={set.weight == null || !set.reps}
                className="h-9 w-9 text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 disabled:opacity-30"
                title="Complete set"
              >
                <Check className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-500">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white border-gray-200 shadow-lg"
              >
                <DropdownMenuItem
                  className="text-orange-500 focus:text-orange-600"
                  onClick={() => onUncompleteSet(entryId, set.id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo / Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300"
                  onClick={() => onRemoveSet(entryId, set.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Set
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Per-set volume display */}
      {set.completed && set.weight && set.reps && (
        <div className="flex items-center gap-2 ml-10 mt-0.5">
          <span className="text-[10px] text-gray-500">
            vol: {(set.weight * set.reps).toFixed(0)}kg
          </span>
        </div>
      )}
    </div>
  );
}

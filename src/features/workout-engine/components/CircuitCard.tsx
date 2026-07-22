// CircuitCard.tsx — v1-fidelity block card for circuit blocks (w2b → fidelity port).
// Rounded-xl border-2 card with per-type tint, chip icon, name, subtitle, 3-dot dropdown,
// and circuit timer block (mono clock + BEST + play/pause/reset).
// Reuses ExerciseCard/SetRow unchanged; hides per-entry "Add Set" in favour of "Add Round" footer.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseCard, type ExercisePBBadges } from './ExerciseCard';
import { BlockMenu } from './BlockMenu';
import { getBlockStylesFromKind } from './block-types';
import type { WorkoutBlock, ExerciseEntry, LoggedSet } from '../types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
  restTimers?: Record<string, { remaining: number; total: number }>;
  /** Optional PB/previous/volume badges per station (keyed by entry.id). Forwarded to each ExerciseCard. */
  badgesByEntryId?: Record<string, ExercisePBBadges>;
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
  restTimers,
  badgesByEntryId,
}: CircuitCardProps) {
  const styles = getBlockStylesFromKind(block.kind);
  const stationCount = block.stations.length;

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [bestTime] = useState<number | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const toggleTimer = () => setTimerRunning((r) => !r);
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
  };

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
            <h3 className={cn('font-semibold', styles.text)}>Circuit</h3>
            <p className="text-xs text-gray-500">
              {stationCount} exercise{stationCount !== 1 ? 's' : ''}
              {stationCount > 0 && ` • ${block.rounds} rounds`}
              {stationCount === 0 && ' • Add exercises below'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Circuit Timer */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'text-2xl font-mono font-bold',
              timerSeconds > 0 && !timerRunning ? 'text-green-400' : styles.text,
            )}>
              {formatTime(timerSeconds)}
            </div>
            {bestTime != null && bestTime > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-500 leading-tight">BEST</span>
                <span className="text-xs font-mono text-amber-400">{formatTime(bestTime)}</span>
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTimer}
              className={cn('h-8 w-8', styles.text)}
              aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={resetTimer}
              className="h-8 w-8 text-gray-400"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <BlockMenu
            hasExercises={stationCount > 0}
            onDelete={() => onRemoveBlock(block.id)}
            onSaveToLibrary={handleSaveToLibrary}
          />
        </div>
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
            restTimers={restTimers}
            {...(badgesByEntryId?.[entry.id] ?? {})}
          />
        ))}
      </div>

      {/* Add Round footer */}
      <div className={cn('p-2 border-t', styles.border)}>
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

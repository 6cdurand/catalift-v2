// CardioCard.tsx — v1-fidelity block card for cardio blocks (w2c → fidelity port).
// Rounded-xl border-2 card with per-type tint, chip icon, name, subtitle (live timer+distance),
// 3-dot dropdown. Cardio has no sets; it's a summary-tier payload (duration/distance/calories/HR).

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BlockMenu } from './BlockMenu';
import { getBlockStylesFromKind } from './block-types';
import type { WorkoutBlock, CardioPayload } from '../types';

interface CardioCardProps {
  block: Extract<WorkoutBlock, { kind: 'cardio' }>;
  onUpdateCardio: (blockId: string, cardio: Partial<CardioPayload>) => void;
  onRemoveBlock: (blockId: string) => void;
}

export function CardioCard({
  block,
  onUpdateCardio,
  onRemoveBlock,
}: CardioCardProps) {
  const styles = getBlockStylesFromKind(block.kind);
  const { cardio } = block;

  const durationMinutes = cardio.durationSeconds
    ? Math.round((cardio.durationSeconds / 60) * 10) / 10
    : 0;
  const distanceKm = cardio.distanceMeters
    ? Math.round((cardio.distanceMeters / 1000) * 100) / 100
    : 0;

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
            <h3 className={cn('font-semibold', styles.text)}>{block.exerciseName}</h3>
            <p className="text-xs text-gray-500">
              {durationMinutes > 0 ? `${durationMinutes} min` : 'No duration set'}
              {distanceKm > 0 && ` • ${distanceKm} km`}
            </p>
          </div>
        </div>

        <BlockMenu
          hasExercises={true}
          onDelete={() => onRemoveBlock(block.id)}
          onSaveToLibrary={handleSaveToLibrary}
        />
      </div>

      {/* Summary inputs */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor={`cardio-duration-${block.id}`} className="text-xs text-gray-600">
            Duration (min)
          </Label>
          <Input
            id={`cardio-duration-${block.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={durationMinutes || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateCardio(block.id, { durationSeconds: 0 });
              } else {
                const minutes = parseFloat(val);
                if (isNaN(minutes)) return;
                onUpdateCardio(block.id, {
                  durationSeconds: Math.max(0, Math.round(minutes * 60)),
                });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`cardio-distance-${block.id}`} className="text-xs text-gray-600">
            Distance (km)
          </Label>
          <Input
            id={`cardio-distance-${block.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={distanceKm || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateCardio(block.id, { distanceMeters: undefined });
              } else {
                const km = parseFloat(val);
                if (isNaN(km)) return;
                onUpdateCardio(block.id, {
                  distanceMeters: Math.max(0, Math.round(km * 1000)),
                });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`cardio-calories-${block.id}`} className="text-xs text-gray-600">
            Calories
          </Label>
          <Input
            id={`cardio-calories-${block.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={cardio.calories ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateCardio(block.id, { calories: undefined });
              } else {
                const cal = parseInt(val, 10);
                if (isNaN(cal)) return;
                onUpdateCardio(block.id, { calories: Math.max(0, cal) });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`cardio-avghr-${block.id}`} className="text-xs text-gray-600">
            Avg HR
          </Label>
          <Input
            id={`cardio-avghr-${block.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={cardio.avgHr ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateCardio(block.id, { avgHr: undefined });
              } else {
                const hr = parseInt(val, 10);
                if (isNaN(hr)) return;
                onUpdateCardio(block.id, { avgHr: Math.max(0, hr) });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`cardio-maxhr-${block.id}`} className="text-xs text-gray-600">
            Max HR
          </Label>
          <Input
            id={`cardio-maxhr-${block.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={cardio.maxHr ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || val === undefined) {
                onUpdateCardio(block.id, { maxHr: undefined });
              } else {
                const hr = parseInt(val, 10);
                if (isNaN(hr)) return;
                onUpdateCardio(block.id, { maxHr: Math.max(0, hr) });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>
      </div>
    </div>
  );
}

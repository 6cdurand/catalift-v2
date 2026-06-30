// CardioCard.tsx — self-contained cardio block logging (w2c).
// Cardio has no sets; it's a summary-tier payload (duration/distance/calories/HR).

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
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
  const { cardio } = block;

  const durationMinutes = cardio.durationSeconds
    ? Math.round((cardio.durationSeconds / 60) * 10) / 10
    : 0;
  const distanceKm = cardio.distanceMeters
    ? Math.round((cardio.distanceMeters / 1000) * 100) / 100
    : 0;

  return (
    <div className="border-l-4 border-emerald-400 bg-emerald-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-emerald-50/50 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Cardio
          </Badge>
          <span className="font-medium text-gray-900 text-sm">
            {block.exerciseName}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemoveBlock(block.id)}
          className="h-8 w-8 text-gray-500 hover:text-red-400"
          title="Remove cardio block"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
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
                onUpdateCardio(block.id, {
                  durationSeconds: Math.round(minutes * 60),
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
                onUpdateCardio(block.id, {
                  distanceMeters: Math.round(km * 1000),
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
                onUpdateCardio(block.id, { calories: parseInt(val, 10) });
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
                onUpdateCardio(block.id, { avgHr: parseInt(val, 10) });
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
                onUpdateCardio(block.id, { maxHr: parseInt(val, 10) });
              }
            }}
            className="bg-gray-50 border-gray-200 text-center text-sm"
          />
        </div>
      </div>
    </div>
  );
}

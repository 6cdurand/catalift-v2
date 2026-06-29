// ExerciseRow.tsx — one exercise row within a block card.
// Ported from v1 WorkoutDayBuilder renderExerciseCardBody (L584-727).
// The edit button opens the rich ExerciseEditDialog (w2b-2) via the parent builder.

'use client';

import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BuilderExercise } from "./builder-types";

interface ExerciseRowProps {
  exercise: BuilderExercise;
  onEdit: () => void;
  onRemove: () => void;
}

export function ExerciseRow({ exercise, onEdit, onRemove }: ExerciseRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors">
      <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0 cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {exercise.exerciseName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0">
            {exercise.sets} × {exercise.reps}
          </Badge>
          <span className="text-[10px] text-gray-500">{exercise.rest} rest</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="h-7 w-7 text-gray-400 hover:text-gray-700"
          title="Edit exercise"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-7 w-7 text-gray-400 hover:text-red-500"
          title="Remove exercise"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// BlockCard.tsx — one block within a day.
// Ported from v1 WorkoutDayBuilder block rendering (L920-1119).
// Renders block header (icon, name, type badge, remove) + exercise list + add-exercise button.

'use client';

import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseRow } from "./ExerciseRow";
import { getBlockStyles, getBlockTypeMeta } from "./block-types";
import type { BuilderBlock } from "./builder-types";

interface BlockCardProps {
  block: BuilderBlock;
  onRemoveBlock: () => void;
  onUpdateBlockName: (name: string) => void;
  onAddExercise: () => void;
  onEditExercise: (exerciseId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

export function BlockCard({
  block,
  onRemoveBlock,
  onUpdateBlockName,
  onAddExercise,
  onEditExercise,
  onRemoveExercise,
}: BlockCardProps) {
  const styles = getBlockStyles(block.type as never);
  const meta = getBlockTypeMeta(block.type as never);

  return (
    <Card className={`bg-white ${styles.border} border-2 overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} aria-hidden="true" />
      <CardContent className="p-0 pl-1">
        {/* Block header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {meta?.icon}
            <Input
              value={block.name}
              onChange={(e) => onUpdateBlockName(e.target.value)}
              className="h-7 text-sm font-medium border-0 px-1 focus-visible:ring-1 focus-visible:ring-gray-300 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles.badge}`}>
              {meta?.label ?? block.type}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onRemoveBlock}
              className="h-7 w-7 text-gray-400 hover:text-red-500"
              title="Remove block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Exercise list */}
        <div className="bg-gray-50/50">
          <div className="divide-y divide-gray-100">
            {block.exercises.map((ex) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                onEdit={() => onEditExercise(ex.id)}
                onRemove={() => onRemoveExercise(ex.id)}
              />
            ))}
          </div>

          {/* Add exercise button */}
          <div className="px-3 py-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddExercise}
              className="w-full text-xs text-gray-500 hover:text-sky-600 h-8"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Exercise
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

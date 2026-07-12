"use client";

// Read-only render of one ProgramDay (label + blocks + prescribed exercises).
// Shared by the client program page's weekly list and the Preview dialog so the
// client sees EXACTLY what the trainer prescribed (sets × reps · rest).

import type { BlockType, ProgramBlock, ProgramDay, ProgramExercise } from "../../types";

// Local block accents (programs-domain, self-contained — no cross-feature import).
const BLOCK_ACCENT: Record<BlockType, { dot: string; badge: string }> = {
  warmup: { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700" },
  work: { dot: "bg-sky-500", badge: "bg-sky-100 text-sky-700" },
  circuit: { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  cardio: { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
  cooldown: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
};

function ExerciseRow({ exercise }: { exercise: ProgramExercise }) {
  return (
    <div className="flex items-center justify-between py-2 px-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {exercise.exerciseName}
        </p>
        {exercise.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{exercise.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 ml-2 shrink-0">
        <span className="tabular-nums">
          {exercise.sets} × {exercise.reps}
        </span>
        <span className="text-gray-300">|</span>
        <span>{exercise.rest}</span>
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: ProgramBlock }) {
  const accent = BLOCK_ACCENT[block.type] ?? BLOCK_ACCENT.work;
  return (
    <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className={`w-1 h-4 rounded-full ${accent.dot}`} />
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${accent.badge}`}>
          {block.type}
        </span>
        <span className="text-sm font-medium text-gray-700">{block.name}</span>
      </div>
      {block.exercises.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {block.exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 px-3 py-3">No exercises</p>
      )}
    </div>
  );
}

export function ProgramDayView({
  day,
  dayIndex,
  showHeader = true,
}: {
  day: ProgramDay;
  dayIndex: number;
  showHeader?: boolean;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50/50 overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Day {dayIndex + 1}: {day.label}
            </p>
            {day.scheduledDay && (
              <p className="text-xs text-gray-400 capitalize mt-0.5">{day.scheduledDay}</p>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {day.blocks.length} {day.blocks.length === 1 ? "block" : "blocks"}
          </span>
        </div>
      )}
      {day.blocks.length > 0 ? (
        <div className="p-3 space-y-2">
          {day.blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 px-4 py-3">No blocks assigned</p>
      )}
    </div>
  );
}

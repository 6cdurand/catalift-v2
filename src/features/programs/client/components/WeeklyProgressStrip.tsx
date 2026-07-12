"use client";

// Weekly progress strip — one pill per weeklyPlan day, coloured by state.
// State comes ONLY from getNextProgramWorkout's completed/locked indices + the
// resolved next day index. No day-index arithmetic here (parity law).

import { Check, Lock } from "lucide-react";
import type { ClientProgram } from "../../types";

export function WeeklyProgressStrip({
  program,
  completedDayIndices,
  lockedDayIndices,
  nextDayIndex,
}: {
  program: ClientProgram;
  completedDayIndices: number[];
  lockedDayIndices: number[];
  nextDayIndex: number;
}) {
  const completed = new Set(completedDayIndices);
  const locked = new Set(lockedDayIndices);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">This week</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {program.weeklyPlan.map((day, idx) => {
          const isCompleted = completed.has(idx);
          const isLocked = locked.has(idx);
          const isNext = idx === nextDayIndex && !isCompleted && !isLocked;

          const base =
            "flex-1 min-w-[64px] rounded-lg border px-2 py-2 text-center transition-colors";
          const tone = isCompleted
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : isLocked
              ? "border-gray-200 bg-gray-50 text-gray-400"
              : isNext
                ? "border-sky-300 bg-sky-50 text-sky-700 ring-1 ring-sky-300"
                : "border-gray-200 bg-white text-gray-600";

          return (
            <div key={day.id} className={`${base} ${tone}`}>
              <div className="flex items-center justify-center h-4 mb-1">
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                )}
              </div>
              <p className="text-[10px] font-medium truncate">{day.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

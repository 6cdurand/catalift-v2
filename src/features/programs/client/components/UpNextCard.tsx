"use client";

// "Up Next" — the single most important card: what the client should train next.
// The next day + remaining-this-week come ENTIRELY from getNextProgramWorkout
// (passed in as `next`); this component performs NO next-day computation.

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Check } from "lucide-react";
import type { ClientProgram } from "../../types";
import type { NextWorkoutResult } from "../../lib/get-next-workout";

export function UpNextCard({
  program,
  next,
  onStart,
  onPreview,
  onSwap,
}: {
  program: ClientProgram;
  next: NextWorkoutResult;
  onStart: (dayIndex: number) => void;
  onPreview: (dayIndex: number) => void;
  onSwap: () => void;
}) {
  // All prescribed days done this week → celebrate, no Start CTA.
  if (next.remainingThisWeek <= 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
        <p className="font-semibold text-gray-900 text-sm">All done this week!</p>
        <p className="text-[10px] text-gray-500">Rest up for next week.</p>
      </div>
    );
  }

  const dayLabel = next.day?.label || "Workout";
  const isPT = program.sessionPTMap[next.dayIndex] === "pt";
  const canSwap = program.weeklyPlan.length > 1;

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
            <Play className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Up Next</p>
            <p className="font-semibold text-gray-900 text-sm">{dayLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge
            className={`text-[10px] border-0 ${
              isPT
                ? "bg-purple-500/20 text-purple-600"
                : "bg-sky-500/20 text-sky-600"
            }`}
          >
            {isPT ? "PT Session" : "Program"}
          </Badge>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {next.remainingThisWeek} left this week
          </p>
        </div>
      </div>

      {next.isExpired && (
        <p className="text-[10px] text-amber-600 mb-2">
          This program has ended — you&apos;re past its end date.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-sm"
          onClick={() => onStart(next.dayIndex)}
        >
          <Play className="w-4 h-4 mr-2" />
          Start {dayLabel}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-gray-200 text-gray-600"
          aria-label={`Preview ${dayLabel}`}
          onClick={() => onPreview(next.dayIndex)}
        >
          <Eye className="w-4 h-4" />
        </Button>
        {canSwap && (
          <Button
            variant="outline"
            className="border-gray-200 text-gray-600 text-sm"
            onClick={onSwap}
          >
            Swap
          </Button>
        )}
      </div>
    </div>
  );
}

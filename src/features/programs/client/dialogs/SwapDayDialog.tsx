"use client";

// Swap dialog — pick a different program day to train today instead of the
// resolved "Up Next" day. This does NOT recompute the schedule; it simply lets
// the client choose any day to start/preview (a hint, not a reschedule).

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Eye, Check } from "lucide-react";
import type { ClientProgram } from "../../types";

export function SwapDayDialog({
  open,
  program,
  completedDayIndices,
  nextDayIndex,
  onOpenChange,
  onStart,
  onPreview,
}: {
  open: boolean;
  program: ClientProgram;
  completedDayIndices: number[];
  nextDayIndex: number;
  onOpenChange: (open: boolean) => void;
  onStart: (dayIndex: number) => void;
  onPreview: (dayIndex: number) => void;
}) {
  const completed = new Set(completedDayIndices);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Swap workout</DialogTitle>
          <DialogDescription>
            Pick a different day to train today.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {program.weeklyPlan.map((day, idx) => {
            const isCompleted = completed.has(idx);
            const isNext = idx === nextDayIndex;
            const exerciseCount = day.blocks.reduce(
              (s, b) => s + b.exercises.length,
              0,
            );
            return (
              <div
                key={day.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  isNext ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Day {idx + 1}: {day.label}
                    </p>
                    {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                    {isNext ? " · up next" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-200 text-gray-600"
                    aria-label={`Preview ${day.label}`}
                    onClick={() => onPreview(idx)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-sky-500 hover:bg-sky-600 text-white"
                    onClick={() => onStart(idx)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

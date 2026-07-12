"use client";

// Preview a single program day read-only (no timer, no workout start).
// Peek at the prescribed blocks/exercises for a day.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProgramDayView } from "../components/ProgramDayView";
import type { ProgramDay } from "../../types";

export function PreviewDayDialog({
  open,
  day,
  dayIndex,
  programName,
  onOpenChange,
}: {
  open: boolean;
  day: ProgramDay | null;
  dayIndex: number;
  programName: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{day?.label ?? "Workout"}</DialogTitle>
          <DialogDescription>{programName} · preview</DialogDescription>
        </DialogHeader>
        {day ? (
          <ProgramDayView day={day} dayIndex={dayIndex} showHeader={false} />
        ) : (
          <p className="text-sm text-gray-400 py-6 text-center">
            Nothing to preview.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

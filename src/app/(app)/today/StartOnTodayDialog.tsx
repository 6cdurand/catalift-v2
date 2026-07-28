"use client";

// "Start Workout Today?" — the confirm prompt when the athlete taps Start on a
// session that is scheduled for a day OTHER than today.
//
// Ported verbatim from the v1 today page (`src/app/today/page.tsx:2203-2249`):
// same title, same body sentence, same Cancel / Start Now pair.
//
// DELIBERATELY NOT PORTED — v1 also ran
// `updateCalendarEvent(event.id, { date: todayStr })` (:2232) and told the user
// "The session date will be updated to today" (:2210). v2 has no
// `calendar_events` table: sessions are derived from the program, so there is
// no row to re-date. That clause is dropped and NO write replaces it.
//
// Presentational only: the date is supplied by the caller, the confirm handler
// starts the workout through the page's existing handleStart(dayIndex).

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatWeekdayMonthDay } from "@/lib/week";

export interface StartOnTodayDialogProps {
  open: boolean;
  /** ISO YYYY-MM-DD the pending session is scheduled for. */
  sessionDate: string | null;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StartOnTodayDialog({
  open,
  sessionDate,
  onOpenChange,
  onCancel,
  onConfirm,
}: StartOnTodayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-white border-gray-200 max-w-md"
        data-testid="start-on-today-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            Start Workout Today?
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            This session is scheduled for{" "}
            {sessionDate ? formatWeekdayMonthDay(sessionDate) : ""}. Start the
            workout now?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-gray-200 text-gray-700"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white"
            onClick={onConfirm}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

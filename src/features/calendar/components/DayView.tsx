"use client";

// Day view (A2 / P-01) — structural port of v1's <UnifiedCalendar> day grid
// (single-day header + hourly time grid). See UnifiedCalendar.tsx:440-479 in v1.
// Same "no time-of-day on ScheduledSession" rationale as WeekView.tsx — read
// that file's header comment before touching this one.

import { memo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSessionsForDate } from "../lib/selectors";
import { CALENDAR_HOURS, formatHourLabel } from "./calendarDate";
import type { ScheduledSession, ScheduledSessionStatus } from "../types";

export interface DayViewProps {
  sessions: ScheduledSession[];
  date: string; // ISO date being displayed
  onSelectDay?: (date: string, sessions: ScheduledSession[]) => void;
  /** Empty-slot click in the hour grid. Host wires this to Add Event (A1). */
  onSlotClick?: (date: string, hour: number) => void;
}

const STATUS_CHIP: Record<ScheduledSessionStatus, string> = {
  done: "bg-emerald-500",
  upcoming: "bg-sky-500",
  missed: "bg-red-400",
  rest: "bg-gray-300",
};

function DayViewBase({ sessions, date, onSelectDay, onSlotClick }: DayViewProps) {
  const daySessions = getSessionsForDate(sessions, date);

  // Day view only ever shows one day, so it IS the selected day — auto-sync
  // `selectedDate` (and therefore the agenda list below) to whatever day is
  // on screen, instead of requiring a redundant tap. The date itself is
  // already shown once, in the CalendarGrid nav header — no second label here.
  useEffect(() => {
    onSelectDay?.(date, daySessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div data-slot="day-grid" data-date={date} className="overflow-hidden rounded-lg border border-gray-200">
      {daySessions.length > 0 && (
        <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-2">
          {daySessions.slice(0, 3).map((s, idx) => (
            <span
              key={idx}
              className={cn("h-1.5 w-1.5 rounded-full", STATUS_CHIP[s.status])}
              aria-label={s.status}
            />
          ))}
        </div>
      )}

      {/* Hour grid — 06:00–19:00, matches v1's range. Every slot is empty
          (see file header); it exists solely for onSlotClick. */}
      <div className="max-h-[420px] overflow-y-auto">
        {CALENDAR_HOURS.map((hour) => (
          <button
            type="button"
            key={hour}
            data-hour={hour}
            aria-label={`${date} ${formatHourLabel(hour)}`}
            onClick={() => onSlotClick?.(date, hour)}
            className="flex w-full border-b border-gray-100 hover:bg-slate-50"
          >
            <span className="w-12 shrink-0 border-r border-gray-100 py-2 px-1 text-left text-[10px] text-muted-foreground">
              {formatHourLabel(hour)}
            </span>
            <span className="flex-1" />
          </button>
        ))}
      </div>
    </div>
  );
}

export const DayView = memo(DayViewBase);

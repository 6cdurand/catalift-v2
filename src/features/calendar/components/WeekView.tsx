"use client";

// Week view (A2 / P-01) — structural port of v1's <UnifiedCalendar> week grid
// (7-day header + hourly time grid). See UnifiedCalendar.tsx:331-421 in v1.
//
// v1's grid places each event in its hour row via `event.startTime`.
// `ScheduledSession` (this feature's canonical shape, selectors.ts) carries no
// time-of-day — it's a derived program day, not a timestamped event — so every
// hour slot here is "empty" by construction. Sessions surface as status chips
// on the day header instead (same chip language as month's DayCell), and the
// hour grid exists to host `onSlotClick`, which A1 wires to the Add Event
// dialog once real (timestamped) calendar_events exist.

import { memo } from "react";
import { cn } from "@/lib/utils";
import { getSessionsForDate } from "../lib/selectors";
import { CALENDAR_HOURS, formatHourLabel } from "./calendarDate";
import type { ScheduledSession, ScheduledSessionStatus } from "../types";

export interface WeekViewProps {
  sessions: ScheduledSession[];
  today: string; // ISO YYYY-MM-DD
  weekDates: string[]; // 7 ISO dates, Sun–Sat
  selectedDate: string | null;
  onSelectDay?: (date: string, sessions: ScheduledSession[]) => void;
  /** Empty-slot click in the hour grid. Host wires this to Add Event (A1). */
  onSlotClick?: (date: string, hour: number) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CHIP: Record<ScheduledSessionStatus, string> = {
  done: "bg-emerald-500",
  upcoming: "bg-sky-500",
  missed: "bg-red-400",
  rest: "bg-gray-300",
};

function WeekViewBase({
  sessions,
  today,
  weekDates,
  selectedDate,
  onSelectDay,
  onSlotClick,
}: WeekViewProps) {
  return (
    <div data-slot="week-grid" className="overflow-hidden rounded-lg border border-gray-200">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDates.map((date, i) => {
          const daySessions = getSessionsForDate(sessions, date);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayNumber = parseInt(date.slice(8), 10);

          return (
            <button
              type="button"
              key={date}
              data-week-date={date}
              onClick={() => onSelectDay?.(date, daySessions)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 transition-colors hover:bg-slate-50",
                isSelected && "bg-sky-50",
              )}
            >
              <span className="text-xs text-muted-foreground">{WEEKDAY_LABELS[i]}</span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday ? "bg-sky-500 text-white" : "text-slate-700",
                )}
              >
                {dayNumber}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {daySessions.slice(0, 3).map((s, idx) => (
                  <span
                    key={idx}
                    className={cn("h-1.5 w-1.5 rounded-full", STATUS_CHIP[s.status])}
                    aria-label={s.status}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hour grid — 06:00–19:00, matches v1's range. Every slot is empty
          (see file header); it exists solely for onSlotClick. */}
      <div className="max-h-[420px] overflow-y-auto">
        {CALENDAR_HOURS.map((hour) => (
          <div key={hour} data-hour={hour} className="flex border-b border-gray-100">
            <div className="w-12 shrink-0 border-r border-gray-100 py-2 px-1 text-[10px] text-muted-foreground">
              {formatHourLabel(hour)}
            </div>
            <div className="grid flex-1 grid-cols-7">
              {weekDates.map((date) => (
                <button
                  type="button"
                  key={`${date}-${hour}`}
                  aria-label={`${date} ${formatHourLabel(hour)}`}
                  onClick={() => onSlotClick?.(date, hour)}
                  className="h-10 border-r border-gray-50 hover:bg-slate-50"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const WeekView = memo(WeekViewBase);

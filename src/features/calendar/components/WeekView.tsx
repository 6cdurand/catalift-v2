"use client";

// Week view (A2 / P-01) — structural port of v1's <UnifiedCalendar> week grid
// (7-day header + hourly time grid). See UnifiedCalendar.tsx:331-421 in v1.
//
// v1's grid places each event in its hour row via `event.startTime`.
// `ScheduledSession` (this feature's canonical shape, selectors.ts) carries no
// time-of-day for a program-derived day — it's a derived day, not a
// timestamped event — so those hour slots stay empty. P-08 (booking lane)
// finishes what this file's header used to describe as a permanent gap:
// `kind: "booking"` sessions DO carry `startTime`, and are now positioned in
// their hour row exactly the way v1 positioned real calendar events.

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

/** Booked sessions on `date` whose `startTime` hour matches `hour`. */
function getBookingsAt(
  sessions: ScheduledSession[],
  date: string,
  hour: number,
): ScheduledSession[] {
  return sessions.filter(
    (s) =>
      s.kind === "booking" &&
      s.date === date &&
      s.startTime &&
      parseInt(s.startTime.slice(0, 2), 10) === hour,
  );
}

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
              {weekDates.map((date) => {
                const bookings = getBookingsAt(sessions, date, hour);
                return (
                  <button
                    type="button"
                    key={`${date}-${hour}`}
                    aria-label={`${date} ${formatHourLabel(hour)}`}
                    onClick={() => onSlotClick?.(date, hour)}
                    className="relative h-10 border-r border-gray-50 hover:bg-slate-50"
                  >
                    {bookings.map((b) => (
                      <span
                        key={b.eventId ?? `${b.date}-${b.startTime}-${b.label}`}
                        data-booking-chip
                        className="absolute inset-x-0.5 top-0.5 truncate rounded bg-rose-500 px-1 text-[9px] font-medium text-white"
                      >
                        {b.startTime} {b.label}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const WeekView = memo(WeekViewBase);

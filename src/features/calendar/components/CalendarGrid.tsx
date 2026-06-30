"use client";

import { memo, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayCell } from "./DayCell";
import type { ScheduledSession } from "../types";

export interface CalendarGridProps {
  sessions: ScheduledSession[];
  today: string; // ISO YYYY-MM-DD
  initialMonth?: Date; // first day of the month to display
  onSelectDay?: (date: string, sessions: ScheduledSession[]) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("default", { month: "long", year: "numeric" });
}

function CalendarGridBase({
  sessions,
  today,
  initialMonth,
  onSelectDay,
}: CalendarGridProps) {
  const [month, setMonth] = useState<Date>(() =>
    initialMonth ? getFirstOfMonth(initialMonth) : getFirstOfMonth(new Date()),
  );
  // NOTE: `new Date()` here is for the initial month display, NOT for computing
  // `today`. The `today` value is injected from the parent (the hook computes
  // it once). This is allowed — it's UI initialization, not date arithmetic.

  // Memoize the grid cells off sessions + month — no per-cell refetch.
  const gridDays = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const startWeekday = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const cells: { date: string; isOutsideMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, m, -i);
      cells.push({ date: toISODate(d), isOutsideMonth: true });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: toISODate(new Date(year, m, d)), isOutsideMonth: false });
    }

    // Trailing days to fill the last week (up to 6 rows × 7 = 42 cells)
    let trailingDay = daysInMonth;
    while (cells.length % 7 !== 0) {
      trailingDay++;
      const d = new Date(year, m, trailingDay);
      cells.push({ date: toISODate(d), isOutsideMonth: true });
    }

    return cells;
  }, [month]);

  // Sessions are memoized at the parent level — the grid does NOT re-derive.
  // getSessionsForDate is a pure filter, called per cell from DayCell.

  const handlePrev = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="w-full" data-slot="calendar-grid">
      {/* Month navigation header */}
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{getMonthLabel(month)}</span>
        <Button variant="ghost" size="icon" onClick={handleNext} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((cell) => (
          <DayCell
            key={cell.date}
            date={cell.date}
            sessions={sessions}
            today={today}
            isOutsideMonth={cell.isOutsideMonth}
            onSelect={onSelectDay}
          />
        ))}
      </div>

      {/* Status legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-green-500")} /> Done
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-blue-500")} /> Upcoming
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-red-400")} /> Missed
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-gray-300")} /> Rest
        </span>
      </div>
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridBase);

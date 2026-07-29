"use client";

import { memo, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayCell } from "./DayCell";
import { SelectedDayList } from "./SelectedDayList";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { addDaysISO, formatDayHeaderLabel, formatWeekRangeLabel, getWeekDates } from "./calendarDate";
import type { ScheduledSession } from "../types";

export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarGridProps {
  sessions: ScheduledSession[];
  today: string; // ISO YYYY-MM-DD
  initialMonth?: Date; // first day of the month to display
  onSelectDay?: (date: string, sessions: ScheduledSession[]) => void;
  /** Empty time-slot click in week/day view. Host wires this to Add Event (A1). */
  onSlotClick?: (date: string, hour: number) => void;
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
  onSlotClick,
}: CalendarGridProps) {
  const [month, setMonth] = useState<Date>(() =>
    initialMonth ? getFirstOfMonth(initialMonth) : getFirstOfMonth(new Date()),
  );
  // NOTE: `new Date()` here is for the initial month display, NOT for computing
  // `today`. The `today` value is injected from the parent (the hook computes
  // it once). This is allowed — it's UI initialization, not date arithmetic.

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  // Week/day views need an anchor date; fall back to `today` until the user
  // taps a day (mirrors v1, where `selectedDate` always defaults to today).
  const anchorDate = selectedDate ?? today;
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

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

  const handlePrev = () => {
    if (viewMode === "month") {
      setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setSelectedDate(addDaysISO(anchorDate, -7));
    } else {
      setSelectedDate(addDaysISO(anchorDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setSelectedDate(addDaysISO(anchorDate, 7));
    } else {
      setSelectedDate(addDaysISO(anchorDate, 1));
    }
  };

  const handleToday = () => {
    const todayDate = new Date(today + "T00:00:00");
    setMonth(getFirstOfMonth(todayDate));
    setSelectedDate(today);
  };

  const handleSelectDay = (date: string, daySessions: ScheduledSession[]) => {
    setSelectedDate(date);
    onSelectDay?.(date, daySessions);
  };

  return (
    <div className="w-full" data-slot="calendar-grid">
      {/* Header: view toggle + month navigation */}
      <div className="mb-3 flex items-center justify-between">
        {/* View-mode switcher */}
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
          <Button
            size="sm"
            variant={viewMode === "month" ? "default" : "ghost"}
            onClick={() => setViewMode("month")}
            className={cn("h-7 px-2.5 text-xs", viewMode === "month" ? "bg-sky-500" : "text-gray-400")}
            aria-label="Month view"
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={viewMode === "week" ? "default" : "ghost"}
            onClick={() => setViewMode("week")}
            className={cn("h-7 px-2.5 text-xs", viewMode === "week" ? "bg-sky-500" : "text-gray-400")}
            aria-label="Week view"
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={viewMode === "day" ? "default" : "ghost"}
            onClick={() => setViewMode("day")}
            className={cn("h-7 px-2.5 text-xs", viewMode === "day" ? "bg-sky-500" : "text-gray-400")}
            aria-label="Day view"
          >
            Day
          </Button>
        </div>

        {/* Nav — label matches the active view (month/week/day) */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={handlePrev} aria-label={`Previous ${viewMode}`}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-gray-900">
            {viewMode === "month" && getMonthLabel(month)}
            {viewMode === "week" && formatWeekRangeLabel(weekDates)}
            {viewMode === "day" && formatDayHeaderLabel(anchorDate)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={handleNext} aria-label={`Next ${viewMode}`}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="ml-1 h-7 px-2.5 text-xs">
            Today
          </Button>
        </div>
      </div>

      {viewMode === "month" && (
        <div data-slot="month-grid">
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
                isSelected={cell.date === selectedDate}
                onSelect={handleSelectDay}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <WeekView
          sessions={sessions}
          today={today}
          weekDates={weekDates}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
          onSlotClick={onSlotClick}
        />
      )}

      {viewMode === "day" && (
        <DayView
          sessions={sessions}
          date={anchorDate}
          onSelectDay={handleSelectDay}
          onSlotClick={onSlotClick}
        />
      )}

      {/* Status legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-emerald-500")} /> Done
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-sky-500")} /> Upcoming
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-red-400")} /> Missed
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-full bg-gray-300")} /> Rest
        </span>
      </div>

      {/* Selected-day event list (agenda) */}
      <SelectedDayList
        sessions={sessions}
        selectedDate={selectedDate}
        today={today}
      />
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridBase);

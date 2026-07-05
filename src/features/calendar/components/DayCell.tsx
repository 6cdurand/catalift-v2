"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSessionsForDate } from "../lib/selectors";
import type { ScheduledSession, ScheduledSessionStatus } from "../types";

export interface DayCellProps {
  date: string; // ISO YYYY-MM-DD
  sessions: ScheduledSession[];
  today: string; // ISO YYYY-MM-DD
  isOutsideMonth?: boolean;
  isSelected?: boolean;
  onSelect?: (date: string, sessions: ScheduledSession[]) => void;
}

const MAX_CHIPS = 3;

const STATUS_CHIP: Record<ScheduledSessionStatus, string> = {
  done: "bg-emerald-500",
  upcoming: "bg-sky-500",
  missed: "bg-red-400",
  rest: "bg-gray-300",
};

const STATUS_HUE: Record<ScheduledSessionStatus, string> = {
  done: "border-emerald-200 bg-emerald-50",
  upcoming: "border-sky-200 bg-sky-50",
  missed: "border-red-200 bg-red-50",
  rest: "border-gray-100 bg-gray-50",
};

function DayCellBase({ date, sessions, today, isOutsideMonth, isSelected, onSelect }: DayCellProps) {
  const isToday = date === today;
  const dayNumber = parseInt(date.slice(8), 10);

  const daySessions = useMemo(
    () => getSessionsForDate(sessions, date),
    [sessions, date],
  );

  const primaryStatus: ScheduledSessionStatus =
    daySessions.length > 0 ? daySessions[0].status : "rest";

  const handleClick = () => {
    onSelect?.(date, daySessions);
  };

  const visibleChips = daySessions.slice(0, MAX_CHIPS);
  const overflow = daySessions.length - MAX_CHIPS;

  return (
    <button
      type="button"
      onClick={handleClick}
      data-date={date}
      data-state={primaryStatus}
      data-today={isToday || undefined}
      data-chip-count={daySessions.length}
      className={cn(
        "relative flex min-h-[52px] flex-col items-stretch rounded-md border p-1 text-left transition-colors",
        "hover:bg-slate-50",
        isOutsideMonth && "opacity-40",
        isSelected && "ring-2 ring-sky-400 ring-offset-1",
        isToday && !isSelected && "ring-2 ring-sky-500 ring-offset-1",
        STATUS_HUE[primaryStatus],
      )}
    >
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          isToday
            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white"
            : "text-slate-700",
        )}
      >
        {dayNumber}
      </span>

      {visibleChips.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-0.5">
          {visibleChips.map((s, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                STATUS_CHIP[s.status],
              )}
              aria-label={s.status}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[10px] font-medium leading-none text-muted-foreground">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export const DayCell = memo(DayCellBase);

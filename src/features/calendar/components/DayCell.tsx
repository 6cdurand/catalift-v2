"use client";

import { memo } from "react";
import { Check, AlertCircle, Moon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionsForDate } from "../lib/selectors";
import type { ScheduledSession } from "../types";

export interface DayCellProps {
  date: string; // ISO YYYY-MM-DD
  sessions: ScheduledSession[];
  today: string; // ISO YYYY-MM-DD
  isOutsideMonth?: boolean;
  onSelect?: (date: string, sessions: ScheduledSession[]) => void;
}

type CellState = "done" | "upcoming" | "missed" | "rest";

function getCellState(date: string, sessions: ScheduledSession[]): CellState {
  const daySessions = getSessionsForDate(sessions, date);
  if (daySessions.length === 0) return "rest";
  // Use the first session's status — the selector already derived it.
  return daySessions[0].status as CellState;
}

function DayCellBase({ date, sessions, today, isOutsideMonth, onSelect }: DayCellProps) {
  const isToday = date === today;
  const state = getCellState(date, sessions);
  const dayNumber = parseInt(date.slice(8), 10);

  const handleClick = () => {
    onSelect?.(date, getSessionsForDate(sessions, date));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-date={date}
      data-state={state}
      data-today={isToday || undefined}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors",
        isOutsideMonth && "opacity-40",
        isToday && "ring-2 ring-primary ring-offset-1",
        state === "done" && "border-green-200 bg-green-50 text-green-700",
        state === "upcoming" && "border-blue-200 bg-blue-50 text-blue-700",
        state === "missed" && "border-red-200 bg-red-50 text-red-600",
        state === "rest" && "border-gray-100 bg-gray-50 text-gray-400",
      )}
    >
      <span className="font-medium">{dayNumber}</span>
      <StatusIcon state={state} />
    </button>
  );
}

function StatusIcon({ state }: { state: CellState }) {
  switch (state) {
    case "done":
      return <Check className="mt-0.5 h-3 w-3" aria-label="done" />;
    case "upcoming":
      return <Circle className="mt-0.5 h-3 w-3" aria-label="upcoming" />;
    case "missed":
      return <AlertCircle className="mt-0.5 h-3 w-3" aria-label="missed" />;
    case "rest":
      return <Moon className="mt-0.5 h-3 w-3" aria-label="rest" />;
  }
}

export const DayCell = memo(DayCellBase);

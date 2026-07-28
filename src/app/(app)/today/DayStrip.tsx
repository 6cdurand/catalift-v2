"use client";

// Today — horizontal day-selector strip ("NBA app" style). MODE-AGNOSTIC:
// the trainer surface and the athlete surface render the SAME strip.
//
// Ported from the v1 today page (`src/app/today/page.tsx:522-580`): Mon→Sun pills,
// prev/next-week chevrons, jump-to-calendar button, EEE + day number, dot
// indicator under days that carry sessions.
//
// Presentational only — every date value is supplied by the caller. The dates
// come from the pure `week.ts` helpers; this file contains NO date arithmetic
// and NO day-index logic (parity law, see the grep-guard tests).

import { useRef } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatAccessibleDate,
  formatDayNumber,
  formatWeekdayShort,
} from "@/lib/week";

/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 40;

export interface DayStripProps {
  /** The 7 ISO YYYY-MM-DD dates of the visible week, Mon→Sun. */
  weekDays: string[];
  /** ISO YYYY-MM-DD currently selected. */
  selectedDate: string;
  /** ISO YYYY-MM-DD device-local today. */
  today: string;
  /** Dates in the visible week that have >= 1 session. */
  datesWithSessions: Set<string>;
  /** ISO date → session count, for accessible names. */
  sessionCountsByDate: Record<string, number>;
  onSelectDate: (iso: string) => void;
  /** Move the visible week by whole weeks (-1 = previous, +1 = next). */
  onShiftWeek: (deltaWeeks: number) => void;
  /** Move the selection by one day (swipe); rolls the week at Mon/Sun. */
  onStepDay: (deltaDays: number) => void;
  onOpenCalendar: () => void;
  /**
   * data-testid of the strip container. Defaults to "day-strip"; the trainer
   * surface keeps its merged "trainer-day-strip" id so its tests and DOM are
   * byte-identical to main.
   */
  testId?: string;
}

function sessionCountLabel(count: number): string {
  if (count === 0) return "no sessions";
  if (count === 1) return "1 session";
  return `${count} sessions`;
}

export function DayStrip({
  weekDays,
  selectedDate,
  today,
  datesWithSessions,
  sessionCountsByDate,
  onSelectDate,
  onShiftWeek,
  onStepDay,
  onOpenCalendar,
  testId = "day-strip",
}: DayStripProps) {
  const swipeOriginX = useRef<number | null>(null);

  // Swipe = pointer/touch only. The pills stay real <button>s with aria-pressed
  // so keyboard and screen-reader users are unaffected by this gesture.
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    swipeOriginX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const origin = swipeOriginX.current;
    swipeOriginX.current = null;
    if (origin === null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (endX === undefined) return;
    const travel = endX - origin;
    if (Math.abs(travel) < SWIPE_THRESHOLD_PX) return;
    onStepDay(travel < 0 ? 1 : -1);
  };

  return (
    <div
      className="flex items-center gap-1 touch-pan-y select-none"
      data-testid={testId}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous week"
        className="h-8 w-8 text-gray-400 hover:text-gray-700 shrink-0"
        onClick={() => onShiftWeek(-1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* flex-1 + max-w keeps all 7 pills on one line at 390px without
          stretching them into slabs on a wider screen. */}
      <div className="flex flex-1 min-w-0 justify-between gap-0.5">
        {weekDays.map((iso) => {
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const hasSessions = datesWithSessions.has(iso);
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${formatAccessibleDate(iso)}, ${sessionCountLabel(
                sessionCountsByDate[iso] ?? 0,
              )}`}
              onClick={() => onSelectDate(iso)}
              className={`flex flex-1 min-w-0 max-w-12 flex-col items-center py-2 px-1.5 rounded-xl transition-all ${
                isSelected
                  ? "bg-sky-500 text-white"
                  : isToday
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">
                {formatWeekdayShort(iso)}
              </span>
              <span className="text-sm font-bold mt-0.5">
                {formatDayNumber(iso)}
              </span>
              {/* Always reserve the dot's box so pill heights never jump. */}
              <span
                aria-hidden="true"
                data-testid={hasSessions ? `day-dot-${iso}` : undefined}
                className={`w-1.5 h-1.5 rounded-full mt-1 ${
                  hasSessions
                    ? isSelected
                      ? "bg-white"
                      : "bg-sky-400"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Next week"
        className="h-8 w-8 text-gray-400 hover:text-gray-700 shrink-0"
        onClick={() => onShiftWeek(1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open calendar"
        className="h-8 w-8 text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 shrink-0 ml-1"
        onClick={onOpenCalendar}
      >
        <CalendarRange className="w-4 h-4" />
      </Button>
    </div>
  );
}

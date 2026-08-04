// Pure date helpers for the week/day calendar views (A2 / P-01).
//
// Mirrors the date arithmetic v1's <UnifiedCalendar> does with date-fns
// (startOfWeek/endOfWeek/addDays), reimplemented without the dependency to
// match this feature's existing convention (see selectors.ts): everything is
// an ISO YYYY-MM-DD string, no Date.now(), local-time only.

/** Parse an ISO YYYY-MM-DD string as a local-time Date (NOT UTC). */
function parseISODate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** Format a Date as ISO YYYY-MM-DD using local-time methods. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Hours 06:00–19:00 — same 14-row range as v1's week/day time grid. */
export const CALENDAR_HOURS = Array.from({ length: 14 }, (_, i) => i + 6);

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

/** Add `days` (may be negative) to an ISO date string. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** The 7 ISO dates (Sun–Sat) of the week containing `iso`. */
export function getWeekDates(iso: string): string[] {
  const anchor = parseISODate(iso);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  start.setDate(start.getDate() - start.getDay()); // back up to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });
}

/** "Jul 27 – Aug 2" style range label for a week's 7 ISO dates. */
export function formatWeekRangeLabel(weekDates: string[]): string {
  const start = parseISODate(weekDates[0]);
  const end = parseISODate(weekDates[weekDates.length - 1]);
  const startLabel = start.toLocaleDateString("default", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("default", { month: "short", day: "numeric" });
  return `${startLabel} \u2013 ${endLabel}`;
}

/** "Wed, Jul 30" style label for a single ISO date. */
export function formatDayHeaderLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

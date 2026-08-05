// Pure booking-form helpers for the Book Session screen (P-02).
//
// Kept separate from page.tsx so the schema-legal-payload guarantee around
// `calendar_events_single_source_ck` (`program_id is null or template_slug
// is null`) can be unit tested without rendering the full page.
//
// Ported verbatim from v1's `clients/[id]/book/page.tsx` (`timeSlots`,
// `sessionDurations`, `calculateEndTime`, `dateOptions` generation) — only
// `workoutSelectionToEventFields` and `toEventType` are new, because they
// are the v2-specific rewrite the brief calls out (§4/§5b).

import { addDays, format } from "date-fns";

export const timeSlots = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

export const sessionDurations = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

/**
 * v1's session types. The stored `CalendarEvent.type` is different — see
 * `toEventType` below (trap §5b: `pt_session` is not a valid v2 type).
 */
export const sessionTypes = [
  { value: "pt_session", label: "PT Session" },
  { value: "consultation", label: "Consultation" },
  { value: "assessment", label: "Assessment" },
] as const;

export type UiSessionType = (typeof sessionTypes)[number]["value"];
export type WorkoutType = "program" | "template" | "empty";

/**
 * `pt_session` is a v1 leftover, not a valid `calendar_events.type` (the DB
 * CHECK only allows `workout | session | consultation | assessment | rest`).
 * Maps it to `session`; the other two pass through unchanged. The
 * user-facing label ("PT Session") never changes — only the stored value.
 */
export function toEventType(
  sessionType: UiSessionType,
): "session" | "consultation" | "assessment" {
  return sessionType === "pt_session" ? "session" : sessionType;
}

export function calculateEndTime(start: string, durationMins: string): string {
  const [hours, mins] = start.split(":").map(Number);
  const totalMins = hours * 60 + mins + parseInt(durationMins, 10);
  const endHours = Math.floor(totalMins / 60) % 24;
  const endMins = totalMins % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
}

export interface DateOption {
  value: string;
  label: string;
}

/** Next `days` days (default 14) starting today, with Today/Tomorrow labels. */
export function buildDateOptions(today: Date, days = 14): DateOption[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE, MMM d"),
    };
  });
}

export interface WorkoutSelection {
  workoutType: WorkoutType;
  programId?: string;
  programDayIndex?: number;
  templateSlug?: string;
}

export interface BookingWorkoutFields {
  programId?: string;
  programDayIndex?: number;
  templateSlug?: string;
}

/**
 * The three-way "what is this session" picker, collapsed into a
 * schema-legal payload fragment. `calendar_events_single_source_ck` requires
 * `program_id is null or template_slug is null` — this is the one place that
 * guarantees it: each branch sets at most one source of truth, and `empty`
 * sets neither.
 */
export function workoutSelectionToEventFields(
  sel: WorkoutSelection,
): BookingWorkoutFields {
  if (sel.workoutType === "program") {
    return { programId: sel.programId, programDayIndex: sel.programDayIndex };
  }
  if (sel.workoutType === "template") {
    return { templateSlug: sel.templateSlug };
  }
  return {};
}

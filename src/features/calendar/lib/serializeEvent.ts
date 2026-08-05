// Row <-> CalendarEvent mappers for public.calendar_events (migration 00017).
//
// The DB uses snake_case + NULL; the domain type (`CalendarEvent` in
// `@/types`) uses camelCase + `undefined` for absent values. Every
// conversion goes through here so no caller hand-rolls a mapping and
// drifts (that is how v1 ended up with a stale schema artefact).
//
// NOT mapped, deliberately:
//   • `color` — no such column. v2 derives event colour from `type` in the
//     week/day views (#105); the domain field is a v1 leftover.
//
// `location` (v1 parity) is mapped both ways below — added as a pair by the
// booking screen (P-02): domain field, row<->domain mappers, and the
// `patchToRow` case in `events.ts`.

import type { Database } from "@/types/database";
import type { CalendarEvent } from "@/types";

export type CalendarEventRow =
  Database["public"]["Tables"]["calendar_events"]["Row"];
export type CalendarEventInsert =
  Database["public"]["Tables"]["calendar_events"]["Insert"];
export type CalendarEventUpdate =
  Database["public"]["Tables"]["calendar_events"]["Update"];

export type CalendarEventType = CalendarEvent["type"];
export type CalendarEventStatus = CalendarEvent["status"];
export type CalendarEventScope = NonNullable<CalendarEvent["eventScope"]>;

/** NULL (DB) -> undefined (domain). */
function orUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/** undefined (domain) -> NULL (DB). */
function orNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * The scope an event gets when the caller did not set one, mirroring v1's
 * backfill in `20250331_calendar_event_scoping.sql`:
 *   • a workout with a client  -> client_assigned (client's calendar)
 *   • no client at all         -> trainer_personal (trainer's calendar only)
 *   • otherwise                -> shared_session (both calendars)
 */
export function deriveEventScope(
  event: Pick<CalendarEvent, "type" | "clientId">,
): CalendarEventScope {
  if (event.type === "workout" && event.clientId) return "client_assigned";
  if (!event.clientId) return "trainer_personal";
  return "shared_session";
}

/**
 * Who sees the event on their personal calendar. The client owns anything
 * addressed to them; otherwise the trainer owns it.
 */
export function deriveOwnerUserId(
  event: Pick<CalendarEvent, "clientId" | "trainerId">,
): string | undefined {
  return event.clientId ?? event.trainerId;
}

export function rowToCalendarEvent(r: CalendarEventRow): CalendarEvent {
  return {
    id: r.id,
    title: r.title,
    type: r.type as CalendarEventType,
    date: r.date,
    startTime: orUndefined(r.start_time),
    endTime: orUndefined(r.end_time),
    duration: orUndefined(r.duration),
    clientId: orUndefined(r.client_id),
    trainerId: orUndefined(r.trainer_id),
    workoutId: orUndefined(r.workout_id),
    notes: orUndefined(r.notes),
    status: r.status as CalendarEventStatus,
    clientConfirmed: r.client_confirmed,
    clientConfirmedAt: orUndefined(r.client_confirmed_at),
    recurrenceGroup: orUndefined(r.recurrence_group),
    contactName: orUndefined(r.contact_name),
    programId: orUndefined(r.program_id),
    programDayIndex: orUndefined(r.program_day_index),
    templateSlug: orUndefined(r.template_slug),
    location: orUndefined(r.location),
    ownerUserId: orUndefined(r.owner_user_id),
    eventScope: orUndefined(r.event_scope) as
      | CalendarEventScope
      | undefined,
  };
}

/**
 * Full row for an insert/upsert. `event_scope` and `owner_user_id` are
 * always populated — they are load-bearing for calendar visibility, and a
 * row written without them silently lands on the wrong calendar.
 *
 * `programId` and `templateSlug` are the two "what is this session" booking
 * modes and are mutually exclusive; the DB enforces it with
 * `calendar_events_single_source_ck`, so a caller sending both gets a
 * check violation rather than an undefined row.
 */
export function calendarEventToRow(event: CalendarEvent): CalendarEventInsert {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    date: event.date,
    start_time: orNull(event.startTime),
    end_time: orNull(event.endTime),
    duration: orNull(event.duration),
    client_id: orNull(event.clientId),
    trainer_id: orNull(event.trainerId),
    workout_id: orNull(event.workoutId),
    program_id: orNull(event.programId),
    program_day_index: orNull(event.programDayIndex),
    template_slug: orNull(event.templateSlug),
    location: orNull(event.location),
    status: event.status,
    notes: orNull(event.notes),
    client_confirmed: event.clientConfirmed ?? false,
    client_confirmed_at: orNull(event.clientConfirmedAt),
    recurrence_group: orNull(event.recurrenceGroup),
    contact_name: orNull(event.contactName),
    owner_user_id: orNull(event.ownerUserId ?? deriveOwnerUserId(event)),
    event_scope: event.eventScope ?? deriveEventScope(event),
  };
}

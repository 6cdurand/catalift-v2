"use client";

// Typed data layer for public.calendar_events (migration 00017).
//
// No UI in this lane — the screens are A1/A2. Every write is awaited with
// retry (global rule 2); nothing is fire-and-forget, because a dropped
// calendar write is a missed session, and missed sessions are money.
//
// READS ARE SCOPE-AWARE ON PURPOSE. RLS stops a client reading a trainer's
// private events, but RLS cannot stop a TRAINER's own calendar filling up
// with every workout they assigned to every client — the trainer legitimately
// owns those rows. That separation is `getVisibleCalendarEvents`
// (`@/lib/calendarScope`), and `listVisibleCalendarEvents` below is the only
// read the UI should use.

import { getBrowserClient } from "@/lib/supabase";
import {
  getVisibleCalendarEvents,
  type CalendarViewer,
} from "@/lib/calendarScope";
import type { CalendarEvent } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  calendarEventToRow,
  deriveEventScope,
  deriveOwnerUserId,
  rowToCalendarEvent,
  type CalendarEventUpdate,
} from "../lib/serializeEvent";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[calendar.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[calendar.${operationName}] retry exhausted`);
}

/**
 * `id` is generated client-side and is `text` in the DB, deliberately: it has
 * to join to the already-shipped `client_sessions.calendar_event_id text`.
 */
export type NewCalendarEvent = Omit<CalendarEvent, "id" | "status"> & {
  id?: string;
  status?: CalendarEvent["status"];
};

export async function createCalendarEvent(
  input: NewCalendarEvent,
): Promise<CalendarEvent> {
  const supabase = getBrowserClient();

  return withRetry(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const event: CalendarEvent = {
      ...input,
      id: input.id ?? uuidv4(),
      status: input.status ?? "scheduled",
      trainerId: input.trainerId ?? user.id,
    };
    event.eventScope = event.eventScope ?? deriveEventScope(event);
    event.ownerUserId = event.ownerUserId ?? deriveOwnerUserId(event);

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(calendarEventToRow(event))
      .select("*")
      .single();
    if (error) throw error;

    return rowToCalendarEvent(data);
  }, "createCalendarEvent");
}

/** Fields a caller may patch. Identity + audit columns are not patchable. */
export type CalendarEventPatch = Partial<
  Omit<CalendarEvent, "id" | "trainerId" | "clientConfirmedAt">
> & {
  /** `null` clears the timestamp (un-confirming a session). */
  clientConfirmedAt?: string | null;
};

function patchToRow(patch: CalendarEventPatch): CalendarEventUpdate {
  const row: CalendarEventUpdate = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.startTime !== undefined) row.start_time = patch.startTime;
  if (patch.endTime !== undefined) row.end_time = patch.endTime;
  if (patch.duration !== undefined) row.duration = patch.duration;
  if (patch.clientId !== undefined) row.client_id = patch.clientId;
  if (patch.workoutId !== undefined) row.workout_id = patch.workoutId;
  if (patch.programId !== undefined) row.program_id = patch.programId;
  if (patch.programDayIndex !== undefined) {
    row.program_day_index = patch.programDayIndex;
  }
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.clientConfirmed !== undefined) {
    row.client_confirmed = patch.clientConfirmed;
  }
  if (patch.clientConfirmedAt !== undefined) {
    row.client_confirmed_at = patch.clientConfirmedAt;
  }
  if (patch.recurrenceGroup !== undefined) {
    row.recurrence_group = patch.recurrenceGroup;
  }
  if (patch.contactName !== undefined) row.contact_name = patch.contactName;
  if (patch.ownerUserId !== undefined) row.owner_user_id = patch.ownerUserId;
  if (patch.eventScope !== undefined) row.event_scope = patch.eventScope;
  return row;
}

export { patchToRow as calendarEventPatchToRow };

export async function updateCalendarEvent(
  id: string,
  patch: CalendarEventPatch,
): Promise<CalendarEvent> {
  const supabase = getBrowserClient();

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .update(patchToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return rowToCalendarEvent(data);
  }, "updateCalendarEvent");
}

/**
 * Cancel, never hard-delete: a cancelled session still has to be explainable
 * when a client disputes a count. `getVisibleCalendarEvents` hides cancelled
 * rows by default.
 */
export async function cancelCalendarEvent(id: string): Promise<CalendarEvent> {
  return updateCalendarEvent(id, { status: "cancelled" });
}

/**
 * The client-side half of the confirm flow. This is the ONLY mutation a
 * client is allowed to make — `calendar_events_client_confirm` plus the
 * `ce_guard_client_update` trigger reject any other column change.
 *
 * `clientConfirmedAt` is deliberately NOT sent: the guard trigger stamps it
 * from the DB clock, so a confirmation time can't be forged or backdated by
 * a device with a wrong (or lying) clock.
 */
export async function setClientConfirmed(
  id: string,
  confirmed: boolean,
): Promise<CalendarEvent> {
  return updateCalendarEvent(id, { clientConfirmed: confirmed });
}

/**
 * Undo "mark complete". One security-definer transaction that sets the event
 * back to `scheduled` AND deletes the `client_sessions` row it created. Never
 * split this into two client-side writes: a partial failure inflates
 * completed-session counts, which drive outstanding payments.
 */
export async function uncompleteCalendarEvent(id: string): Promise<void> {
  const supabase = getBrowserClient();

  await withRetry(async () => {
    const { error } = await supabase.rpc("uncomplete_calendar_event", {
      p_event_id: id,
    });
    if (error) throw error;
  }, "uncompleteCalendarEvent");
}

export interface ListCalendarEventsArgs extends CalendarViewer {
  /** ISO YYYY-MM-DD inclusive. */
  rangeStart?: string;
  /** ISO YYYY-MM-DD inclusive. */
  rangeEnd?: string;
  /** Default true. false = include cancelled (audit views). */
  hideCancelled?: boolean;
}

/**
 * Every calendar event `viewer` should see, already scope-filtered.
 *
 * Two layers, both required:
 *   1. the query + RLS narrow to rows the viewer is allowed to read;
 *   2. `getVisibleCalendarEvents` then drops rows the viewer owns but should
 *      not see on their OWN calendar (a trainer's clients' assigned workouts).
 */
export async function listVisibleCalendarEvents(
  args: ListCalendarEventsArgs,
): Promise<CalendarEvent[]> {
  const supabase = getBrowserClient();
  const { userId, mode, rangeStart, rangeEnd, hideCancelled } = args;

  let query = supabase.from("calendar_events").select("*");
  query =
    mode === "trainer"
      ? query.eq("trainer_id", userId)
      : query.or(`client_id.eq.${userId},owner_user_id.eq.${userId}`);

  if (rangeStart) query = query.gte("date", rangeStart);
  if (rangeEnd) query = query.lte("date", rangeEnd);

  const { data, error } = await query.order("date", { ascending: true });
  if (error) throw error;

  const events = (data ?? []).map(rowToCalendarEvent);
  return getVisibleCalendarEvents(events, { userId, mode }, { hideCancelled });
}

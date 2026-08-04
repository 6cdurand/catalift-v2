import { describe, it, expect } from "vitest";
import {
  calendarEventToRow,
  deriveEventScope,
  deriveOwnerUserId,
  rowToCalendarEvent,
  type CalendarEventRow,
} from "../serializeEvent";
import type { CalendarEvent } from "@/types";

const TRAINER = "11111111-1111-1111-1111-111111111111";
const CLIENT = "22222222-2222-2222-2222-222222222222";

function row(overrides: Partial<CalendarEventRow> = {}): CalendarEventRow {
  return {
    id: "evt-1",
    title: "PT Session",
    type: "session",
    date: "2026-08-03",
    start_time: "09:00:00",
    end_time: "10:00:00",
    duration: 60,
    trainer_id: TRAINER,
    client_id: CLIENT,
    workout_id: null,
    program_id: null,
    program_day_index: null,
    template_slug: null,
    status: "scheduled",
    location: null,
    notes: null,
    client_confirmed: false,
    client_confirmed_at: null,
    recurrence_group: null,
    contact_name: null,
    owner_user_id: CLIENT,
    event_scope: "shared_session",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("rowToCalendarEvent", () => {
  it("maps snake_case columns onto the domain shape", () => {
    expect(rowToCalendarEvent(row())).toEqual<CalendarEvent>({
      id: "evt-1",
      title: "PT Session",
      type: "session",
      date: "2026-08-03",
      startTime: "09:00:00",
      endTime: "10:00:00",
      duration: 60,
      clientId: CLIENT,
      trainerId: TRAINER,
      workoutId: undefined,
      notes: undefined,
      status: "scheduled",
      clientConfirmed: false,
      clientConfirmedAt: undefined,
      recurrenceGroup: undefined,
      contactName: undefined,
      programId: undefined,
      programDayIndex: undefined,
      templateSlug: undefined,
      ownerUserId: CLIENT,
      eventScope: "shared_session",
    });
  });

  it("turns every NULL into undefined, never null", () => {
    const mapped = rowToCalendarEvent(
      row({ trainer_id: null, client_id: null, owner_user_id: null }),
    );
    expect(mapped.trainerId).toBeUndefined();
    expect(mapped.clientId).toBeUndefined();
    expect(mapped.ownerUserId).toBeUndefined();
    expect(Object.values(mapped)).not.toContain(null);
  });

  it("reads a trainer-template slug back out", () => {
    expect(rowToCalendarEvent(row({ template_slug: "upper-3day" })).templateSlug).toBe(
      "upper-3day",
    );
  });

  it("preserves the scope fields the visibility filter depends on", () => {
    const mapped = rowToCalendarEvent(
      row({ event_scope: "trainer_personal", owner_user_id: TRAINER }),
    );
    expect(mapped.eventScope).toBe("trainer_personal");
    expect(mapped.ownerUserId).toBe(TRAINER);
  });
});

describe("calendarEventToRow", () => {
  const base: CalendarEvent = {
    id: "evt-2",
    title: "Leg Day",
    type: "workout",
    date: "2026-08-04",
    status: "scheduled",
    trainerId: TRAINER,
    clientId: CLIENT,
  };

  it("turns every undefined into NULL, never undefined", () => {
    const r = calendarEventToRow(base);
    expect(r.notes).toBeNull();
    expect(r.start_time).toBeNull();
    expect(Object.values(r)).not.toContain(undefined);
  });

  it("ALWAYS populates event_scope and owner_user_id", () => {
    const r = calendarEventToRow(base);
    expect(r.event_scope).toBe("client_assigned");
    expect(r.owner_user_id).toBe(CLIENT);
  });

  it("does not overwrite an explicit scope", () => {
    const r = calendarEventToRow({
      ...base,
      eventScope: "shared_session",
      ownerUserId: TRAINER,
    });
    expect(r.event_scope).toBe("shared_session");
    expect(r.owner_user_id).toBe(TRAINER);
  });

  it("defaults client_confirmed to false rather than NULL (column is NOT NULL)", () => {
    expect(calendarEventToRow(base).client_confirmed).toBe(false);
  });

  it("carries a trainer-template slug without touching workout_id", () => {
    const r = calendarEventToRow({ ...base, templateSlug: "upper-3day" });
    expect(r.template_slug).toBe("upper-3day");
    expect(r.workout_id).toBeNull();
    expect(r.program_id).toBeNull();
  });

  it("maps the program booking mode to program_id + program_day_index", () => {
    const r = calendarEventToRow({
      ...base,
      programId: "33333333-3333-3333-3333-333333333333",
      programDayIndex: 2,
    });
    expect(r.program_id).toBe("33333333-3333-3333-3333-333333333333");
    expect(r.program_day_index).toBe(2);
    expect(r.template_slug).toBeNull();
  });

  it("maps the empty booking mode to neither", () => {
    const r = calendarEventToRow(base);
    expect(r.program_id).toBeNull();
    expect(r.template_slug).toBeNull();
  });

  it("round-trips through rowToCalendarEvent", () => {
    const written = calendarEventToRow(base);
    const readBack = rowToCalendarEvent(
      row({
        ...written,
        location: null,
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      } as CalendarEventRow),
    );
    expect(readBack.id).toBe(base.id);
    expect(readBack.title).toBe(base.title);
    expect(readBack.type).toBe(base.type);
    expect(readBack.date).toBe(base.date);
    expect(readBack.clientId).toBe(CLIENT);
    expect(readBack.trainerId).toBe(TRAINER);
    expect(readBack.eventScope).toBe("client_assigned");
  });
});

describe("deriveEventScope / deriveOwnerUserId", () => {
  it("a workout with a client is client_assigned", () => {
    expect(deriveEventScope({ type: "workout", clientId: CLIENT })).toBe(
      "client_assigned",
    );
  });

  it("no client at all is trainer_personal", () => {
    expect(deriveEventScope({ type: "workout", clientId: undefined })).toBe(
      "trainer_personal",
    );
    expect(deriveEventScope({ type: "session", clientId: undefined })).toBe(
      "trainer_personal",
    );
  });

  it("anything else with a client is a shared_session", () => {
    expect(deriveEventScope({ type: "session", clientId: CLIENT })).toBe(
      "shared_session",
    );
    expect(deriveEventScope({ type: "consultation", clientId: CLIENT })).toBe(
      "shared_session",
    );
  });

  it("the client owns an addressed event, otherwise the trainer does", () => {
    expect(deriveOwnerUserId({ clientId: CLIENT, trainerId: TRAINER })).toBe(
      CLIENT,
    );
    expect(
      deriveOwnerUserId({ clientId: undefined, trainerId: TRAINER }),
    ).toBe(TRAINER);
  });
});

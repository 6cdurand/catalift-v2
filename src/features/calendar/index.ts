// Public API of the calendar feature.
// Wave 1: canonical type + pure selectors.
// Wave 2: shared hook + grid components.
// B1: calendar_events data layer (no UI — the screens are A1/A2).

export {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
  setClientConfirmed,
  uncompleteCalendarEvent,
  listVisibleCalendarEvents,
  calendarEventPatchToRow,
  type NewCalendarEvent,
  type CalendarEventPatch,
  type ListCalendarEventsArgs,
} from "./api/events";

export {
  rowToCalendarEvent,
  calendarEventToRow,
  deriveEventScope,
  deriveOwnerUserId,
  type CalendarEventRow,
  type CalendarEventInsert,
  type CalendarEventUpdate,
  type CalendarEventScope,
} from "./lib/serializeEvent";

export type {
  ScheduledSession,
  ScheduledSessionStatus,
  ScheduledSessionKind,
} from "./types";

export {
  buildScheduledSessions,
  getSessionsForDate,
  deriveStatus,
  type BuildScheduledSessionsInput,
} from "./lib/selectors";

export {
  useScheduledSessions,
  buildScheduledSessionsResult,
  deriveCompletedDayIndices,
  toISODate,
  type UseScheduledSessionsArgs,
  type UseScheduledSessionsResult,
} from "./hooks/useScheduledSessions";

export { CalendarGrid, type CalendarGridProps, type CalendarViewMode } from "./components/CalendarGrid";
export { DayCell, type DayCellProps } from "./components/DayCell";
export { SelectedDayList, type SelectedDayListProps } from "./components/SelectedDayList";
export { WeekView, type WeekViewProps } from "./components/WeekView";
export { DayView, type DayViewProps } from "./components/DayView";

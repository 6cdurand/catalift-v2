// Public API of the calendar feature.
// Wave 1: canonical type + pure selectors.
// Wave 2: shared hook + grid components.

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

export { CalendarGrid, type CalendarGridProps } from "./components/CalendarGrid";
export { DayCell, type DayCellProps } from "./components/DayCell";

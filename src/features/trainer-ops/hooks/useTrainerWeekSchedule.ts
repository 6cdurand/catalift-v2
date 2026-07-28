"use client";

// Trainer-scoped week schedule — the data seam behind the trainer Today
// day-selector.
//
// WHY A NEW HOOK: `useScheduledSessions` (features/calendar) is CLIENT-scoped —
// it reads the logged-in user's own programs from `useProgramsStore` and their
// own `workouts` rows. It cannot produce a trainer's cross-client schedule.
// This hook fans out over the roster and then reuses the SAME pure selectors:
//
//   selectActivePrograms → getNextProgramWorkout → buildScheduledSessionsResult
//
// PARITY LAW (BUG-001/010): there is ZERO day-index / next-day / weekday
// arithmetic in this file. The only source of "which program day" is
// getNextProgramWorkout + buildScheduledSessions. Enforced by the grep-guard
// test in ../__tests__/trainer-schedule-parity-guard.test.ts.

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildScheduledSessionsResult,
  getSessionsForDate,
  type ScheduledSession,
} from "@/features/calendar";
import { fetchTrainerSessions } from "@/features/payments";
import {
  deriveCompletedDayIndices,
  fetchClientProgramsForTrainer,
  getNextProgramWorkout,
  selectActivePrograms,
  type ClientProgram,
} from "@/features/programs";
import { getBrowserClient } from "@/lib/supabase";
import { toISODate } from "@/lib/week";

import { fetchClients } from "../api/roster";

// ─── Public interface ──────────────────────────────────────────────────────

export interface TrainerDaySession {
  clientId: string;
  clientName: string;
  avatarUrl: string | null;
  /** The canonical program-derived session (from the shared calendar selectors). */
  session: ScheduledSession;
  /** Name of the program the session came from — the row's sub-line suffix. */
  programName: string;
  /** Synthetic dedupe key written to `client_sessions.calendar_event_id`. */
  completedKey: string;
  /** True when a `client_sessions` row already exists for `completedKey`. */
  isMarkedComplete: boolean;
}

export interface UseTrainerWeekScheduleArgs {
  trainerId: string | undefined;
  enabled: boolean;
  /** ISO YYYY-MM-DD — Monday of the visible week. */
  rangeStart: string;
  /** ISO YYYY-MM-DD — Sunday of the visible week. */
  rangeEnd: string;
  /** ISO YYYY-MM-DD — the day whose sessions are rendered. */
  selectedDate: string;
}

export interface UseTrainerWeekScheduleResult {
  /** Sessions on `selectedDate`, across every client. */
  daySessions: TrainerDaySession[];
  /** Every date in the visible range with >= 1 session — drives the strip dots. */
  datesWithSessions: Set<string>;
  /** Session count per ISO date in range — drives the strip's accessible names. */
  sessionCountsByDate: Record<string, number>;
  /** Roster size (active + pending) — drives the "no clients yet" empty state. */
  clientCount: number;
  isLoading: boolean;
  error: Error | null;
  /** Re-run the fetch (called after a successful mark-complete). */
  refresh: () => void;
}

/**
 * The synthetic dedupe key for a program-derived session.
 *
 * Program-derived rows have neither a `workout_id` nor a real
 * `calendar_event_id`, so nothing would stop a double-tap (or a second device)
 * inserting two `client_sessions` rows. Writing this key into
 * `calendar_event_id` puts the row under the existing partial unique index
 * `client_sessions_dedupe_event (client_id, calendar_event_id)`, so repeat
 * marks collapse to ONE row (markSessionComplete swallows 23505).
 *
 * FORMAT IS LOAD-BEARING — UI-A / UI-B and the future booking lane must be able
 * to recognise these rows. Do not change it without updating those consumers.
 */
export function buildCompletedKey(
  programId: string,
  dayIndex: number,
  date: string,
): string {
  return `program:${programId}:${dayIndex}:${date}`;
}

// ─── Pure builder (testable without React) ─────────────────────────────────

export interface TrainerScheduleClient {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface BuildTrainerWeekScheduleInput {
  clients: TrainerScheduleClient[];
  /** clientId → that client's `client_programs` rows. */
  programsByClient: Record<string, ClientProgram[]>;
  /**
   * clientId → ISO dates (device-local) with a `workouts` row, FULL HISTORY.
   * Must NOT be pre-filtered to the visible week — deriveCompletedDayIndices
   * needs the whole history or the trainer's next-day diverges from the
   * client's. See fetchAllCompletedDates below.
   */
  completedDatesByClient: Record<string, string[]>;
  /** `calendar_event_id` values already present in `client_sessions`. */
  markedKeys: Set<string>;
  rangeStart: string;
  rangeEnd: string;
  selectedDate: string;
  /** The real device-local today — drives upcoming / missed / done. */
  today: string;
}

export interface BuildTrainerWeekScheduleResult {
  daySessions: TrainerDaySession[];
  datesWithSessions: Set<string>;
  sessionCountsByDate: Record<string, number>;
}

export function buildTrainerWeekSchedule(
  input: BuildTrainerWeekScheduleInput,
): BuildTrainerWeekScheduleResult {
  const {
    clients,
    programsByClient,
    completedDatesByClient,
    markedKeys,
    rangeStart,
    rangeEnd,
    selectedDate,
    today,
  } = input;

  const daySessions: TrainerDaySession[] = [];
  const sessionCountsByDate: Record<string, number> = {};

  for (const client of clients) {
    const programs = programsByClient[client.id] ?? [];
    if (programs.length === 0) continue;

    const completedDates = completedDatesByClient[client.id] ?? [];

    // 1. Which programs apply — the SAME precedence rule the athlete sees.
    const { baseProgram, oneOffForToday } = selectActivePrograms(
      programs,
      selectedDate,
    );
    if (!baseProgram && !oneOffForToday) continue;

    // 2. Which program day is next — the ONLY authority, never recomputed here.
    const next = baseProgram
      ? getNextProgramWorkout(
          baseProgram,
          deriveCompletedDayIndices(baseProgram, completedDates),
          [],
        )
      : null;
    const oneOffNext = oneOffForToday
      ? getNextProgramWorkout(oneOffForToday, [], [])
      : null;

    // 3. Which dates carry a session — the shared calendar selector.
    const { sessions } = buildScheduledSessionsResult({
      program: baseProgram,
      next,
      completedDates,
      rangeStart,
      rangeEnd,
      today,
      oneOffProgram: oneOffForToday,
      oneOffNext,
    });

    if (sessions.length === 0) continue;

    const programNameById = new Map<string, string>();
    for (const program of programs) programNameById.set(program.id, program.name);

    for (const session of sessions) {
      sessionCountsByDate[session.date] =
        (sessionCountsByDate[session.date] ?? 0) + 1;
    }

    for (const session of getSessionsForDate(sessions, selectedDate)) {
      // `ScheduledSession.programId` is optional in the type, but both builders
      // in calendar/lib/selectors.ts always set it (:127, :161), so this is
      // unreachable for kind === "program-day". Both halves are pinned by
      // __tests__/useTrainerWeekSchedule.test.ts:
      //   "every program-day session carries a programId, so the dedupe key is
      //    never 'unknown'"            — the happy path
      //   "skips a session with no programId and never mints a
      //    program:unknown: key"       — this branch, via a stubbed selector
      //
      // It must stay unreachable: a literal "unknown" in the dedupe key would
      // make two DIFFERENT programs for the same client collide on the same
      // (dayIndex, date) and silently dedupe to one ledger row. If a future
      // session kind (booking / group-event / ad-hoc) arrives without a
      // programId, give it its own key namespace rather than reusing this one.
      if (!session.programId) {
        console.error(
          "[useTrainerWeekSchedule] session with no programId, skipping:",
          session,
        );
        continue;
      }
      const completedKey = buildCompletedKey(
        session.programId,
        session.dayIndex,
        session.date,
      );
      daySessions.push({
        clientId: client.id,
        clientName: client.name,
        avatarUrl: client.avatarUrl,
        session,
        programName: programNameById.get(session.programId) ?? "",
        completedKey,
        isMarkedComplete: markedKeys.has(completedKey),
      });
    }
  }

  daySessions.sort((a, b) => a.clientName.localeCompare(b.clientName));

  return {
    daySessions,
    datesWithSessions: new Set(Object.keys(sessionCountsByDate)),
    sessionCountsByDate,
  };
}

// ─── The hook ──────────────────────────────────────────────────────────────

interface FetchedState {
  clients: TrainerScheduleClient[];
  programsByClient: Record<string, ClientProgram[]>;
  completedDatesByClient: Record<string, string[]>;
  markedKeys: Set<string>;
}

const EMPTY_STATE: FetchedState = {
  clients: [],
  programsByClient: {},
  completedDatesByClient: {},
  markedKeys: new Set(),
};

/** Identity of the data currently on screen — a change means "show skeletons". */
interface LoadedResult {
  key: string;
  data: FetchedState;
  error: Error | null;
}

export function useTrainerWeekSchedule(
  args: UseTrainerWeekScheduleArgs,
): UseTrainerWeekScheduleResult {
  const { trainerId, enabled, rangeStart, rangeEnd, selectedDate } = args;

  // The ONE device-local today, computed once per mount (never per render).
  const [today] = useState(() => toISODate(new Date()));

  const active = Boolean(trainerId) && enabled;
  const dataKey = `${trainerId ?? ""}|${rangeStart}|${rangeEnd}`;

  const [refreshToken, setRefreshToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedResult | null>(null);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    if (!trainerId || !enabled) return;

    let cancelled = false;

    async function load(id: string) {
      try {
        const [roster, programs] = await Promise.all([
          fetchClients(),
          fetchClientProgramsForTrainer(id),
        ]);
        if (cancelled) return;

        // Active + pending clients both appear on the schedule.
        const clients = roster.clients
          .filter((c) => c.status === "active" || c.status === "pending")
          .map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }));
        const clientIds = new Set(clients.map((c) => c.id));

        const programsByClient: Record<string, ClientProgram[]> = {};
        for (const program of programs) {
          if (!clientIds.has(program.clientId)) continue;
          (programsByClient[program.clientId] ??= []).push(program);
        }

        const completedDatesByClient = await fetchAllCompletedDates([
          ...clientIds,
        ]);
        if (cancelled) return;

        const marked = await fetchTrainerSessions({ rangeStart, rangeEnd });
        if (cancelled) return;

        const markedKeys = new Set<string>();
        for (const session of marked) {
          if (session.calendarEventId) markedKeys.add(session.calendarEventId);
        }

        setLoaded({
          key: dataKey,
          data: {
            clients,
            programsByClient,
            completedDatesByClient,
            markedKeys,
          },
          error: null,
        });
      } catch (err) {
        if (!cancelled) {
          setLoaded({ key: dataKey, data: EMPTY_STATE, error: err as Error });
        }
      }
    }

    load(trainerId);

    return () => {
      cancelled = true;
    };
  }, [trainerId, enabled, dataKey, rangeStart, rangeEnd, refreshToken]);

  // Fresh === the loaded snapshot describes the week we are rendering.
  // A week shift invalidates it (skeletons); refresh() does not (no flash).
  const fresh = loaded && loaded.key === dataKey ? loaded : null;
  const fetched = fresh?.data ?? EMPTY_STATE;

  const built = useMemo(
    () =>
      buildTrainerWeekSchedule({
        clients: fetched.clients,
        programsByClient: fetched.programsByClient,
        completedDatesByClient: fetched.completedDatesByClient,
        markedKeys: fetched.markedKeys,
        rangeStart,
        rangeEnd,
        selectedDate,
        today,
      }),
    [fetched, rangeStart, rangeEnd, selectedDate, today],
  );

  return {
    daySessions: built.daySessions,
    datesWithSessions: built.datesWithSessions,
    sessionCountsByDate: built.sessionCountsByDate,
    clientCount: fetched.clients.length,
    isLoading: active && fresh === null,
    error: fresh?.error ?? null,
    refresh,
  };
}

/**
 * One `workouts` read across the whole roster — FULL HISTORY, no date filter.
 *
 * DO NOT ADD A DATE RANGE HERE. These dates feed deriveCompletedDayIndices,
 * which needs a client's whole history to know where they are in the program:
 *   - fixed mode maps each completed date to a weeklyPlan index, so filtering
 *     to the visible week silently drops indices completed in earlier weeks;
 *   - flexible mode returns [0 … completedDates.length - 1], so a week-scoped
 *     read RESETS the client to day 0 on any week they haven't trained.
 * Either way the trainer's "next day" would diverge from the client's own
 * Today. The athlete path reads unfiltered for exactly this reason
 * (useScheduledSessions.ts:164-168) and we must match it.
 *
 * Out-of-range dates are harmless downstream: buildScheduledSessions only ever
 * does a Set membership test per date it already decided to render
 * (selectors.ts:123), so extra history cannot invent sessions.
 *
 * No new cost: fetchClients already reads `workouts` for this roster unfiltered.
 *
 * BEST-EFFORT (same contract as fetchClients' session enrichment): a workouts
 * failure must not blank the schedule — rows simply render as not-yet-done.
 * `performed_at` is a timestamptz, converted back to device-local ISO dates.
 */
async function fetchAllCompletedDates(
  clientIds: string[],
): Promise<Record<string, string[]>> {
  const byClient: Record<string, string[]> = {};
  if (clientIds.length === 0) return byClient;

  const supabase = getBrowserClient();

  const { data, error } = await supabase
    .from("workouts")
    .select("user_id, performed_at")
    .in("user_id", clientIds)
    .order("performed_at", { ascending: true });

  if (error) {
    console.error("[useTrainerWeekSchedule] workouts read failed:", error);
    return byClient;
  }

  for (const row of (data ?? []) as Array<{
    user_id: string;
    performed_at: string;
  }>) {
    (byClient[row.user_id] ??= []).push(toISODate(new Date(row.performed_at)));
  }

  return byClient;
}

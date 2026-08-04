"use client";

// /today — the rich home surface (F2). COMPOSITION, not a from-scratch port: it
// wires the v2 data seams (session + active client program + scheduled sessions +
// workout-history stats) into the presentational <TodaySurface />, which reuses
// the w3 client-program components.
//
// Parity law (BUG-001/010): "Up Next" / next-day come ONLY from
// getNextProgramWorkout via useActiveClientProgram. This file contains NO
// day-index / rotation / weekday / next-index logic (see parity-guard test).
// Calendar-date arithmetic for the visible week lives ONLY in @/lib/week.
//
// Day selector (Phase 1b, Christo 2026-07-29): ONE `selectedDate` owns the
// athlete surface, exactly as the v1 today page (`src/app/today/page.tsx:65-79`).
// The week window is derived from it and handed to useScheduledSessions as a
// Mon→Sun range — that widened range is the whole data change.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Users } from "lucide-react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession, useUserRole } from "@/features/auth";
import { useScheduledSessions, type ScheduledSession } from "@/features/calendar";
import { useActiveClientProgram } from "@/features/programs";
import { PreviewDayDialog } from "@/features/programs/client/dialogs/PreviewDayDialog";
import { SwapDayDialog } from "@/features/programs/client/dialogs/SwapDayDialog";
import { useViewModeStore } from "@/hooks/use-view-mode";
import { convertProgramDayToWorkoutBlocks } from "@/lib/programStartUtils";
import {
  DAYS_IN_WEEK,
  formatLongDate,
  formatWeekdayLong,
  getWeekWindow,
  shiftISODate,
  toISODate,
} from "@/lib/week";
import { useActiveWorkoutStore } from "@/features/workout-engine/stores/active-workout-store";
import { userScopedKey } from "@/utils/user-scoped-key";
import {
  SELECTED_DATE_RESOURCE,
  readSelectedDate,
  subscribeToSelectedDate,
  writeSelectedDate,
} from "./selected-date-storage";
import { StartOnTodayDialog } from "./StartOnTodayDialog";
import { TodaySurface } from "./TodaySurface";
import { TrainerTodaySurface } from "./TrainerTodaySurface";
import { useTodayStats } from "./useTodayStats";
import { useTrainerTodayData } from "./useTrainerTodayData";

export default function TodayPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const setViewMode = useViewModeStore((s) => s.setViewMode);
  const viewOverride = useViewModeStore((s) => s.viewOverride);

  const isTrainerRole = role === "trainer";

  // BUG-024: `role` reports "client" while the profile row is in flight, so
  // `!isTrainerMode` cannot distinguish "is an athlete" from "not known yet".
  // Rendering either surface before identity resolves flashes the wrong one.
  // The mode toggle at :220 already gates on `roleLoading` — this makes the
  // surfaces agree.
  const identityResolved = !sessionLoading && !roleLoading;

  // BUG-024: `isTrainerMode` used to read `authUser?.mode` from `useAuthUser`,
  // which runs its OWN separate `useUserRole` fetch (same contract, different
  // hook instance). That fetch can resolve in a LATER render than this page's
  // own `role`/`roleLoading`, so `identityResolved` could flip true while
  // `isTrainerMode` was still on its stale "user" default — reopening the same
  // flash `identityResolved` exists to close. Derive it instead from the ONE
  // role source this page already gates rendering on, plus the existing
  // view-mode override (semantics unchanged: override wins, otherwise follow
  // the server-governed role).
  const isTrainerMode = (viewOverride ?? (isTrainerRole ? "trainer" : "user")) === "trainer";

  // ONE selected day for the athlete surface (v1 :65-79).
  //
  // Composed from three sources, in order: what the user picked this mount →
  // what sessionStorage remembers → device-local today. The stored value is
  // read through useSyncExternalStore, not copied into state by an effect, so
  // there is no cascading render and no SSR/hydration mismatch
  // (getServerSnapshot returns null, and the key only exists once auth resolves).
  // A stored date OUTSIDE the current week is honoured as-is (v1 behaviour) —
  // the visible week follows the selection, never the reverse.
  //
  // `deviceToday` seeds the default only; `today` from useScheduledSessions
  // stays the ONE authority for "is this today" everywhere below.
  const [deviceToday] = useState(() => toISODate(new Date()));
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  // Per-user key (AGENTS.md #4 — never a bare cache key). Resource name is v1's
  // key, so this reads `catalift-today-selected-date-<userId>`.
  const storageKey = user?.id
    ? userScopedKey(SELECTED_DATE_RESOURCE, user.id)
    : null;

  const storedDate = useSyncExternalStore(
    subscribeToSelectedDate,
    () => (storageKey ? readSelectedDate(storageKey) : null),
    () => null,
  );

  const selectedDate = pickedDate ?? storedDate ?? deviceToday;

  // sessionStorage (not localStorage): the selection survives navigating away
  // and back within the tab, and is forgotten with the browser session (v1 :77-79).
  useEffect(() => {
    if (!storageKey || pickedDate === null) return;
    writeSelectedDate(storageKey, pickedDate);
  }, [storageKey, pickedDate]);

  // Mon→Sun window around the selection (v1 :292-294) — the range we now ask
  // useScheduledSessions for instead of a single day.
  const week = useMemo(() => getWeekWindow(selectedDate), [selectedDate]);

  const { sessions, today, isLoading, error } = useScheduledSessions({
    rangeStart: week.rangeStart,
    rangeEnd: week.rangeEnd,
  });

  const { activeProgram, next, completedDayIndices, oneOffProgram, oneOffNext } =
    useActiveClientProgram(user?.id, sessionLoading);

  // Dated one-off takes precedence on Today when available.
  const effectiveProgram = oneOffProgram ?? activeProgram;
  const effectiveNext = oneOffProgram ? oneOffNext : next;

  const { stats } = useTodayStats(user?.id, sessionLoading);

  const trainerData = useTrainerTodayData(user?.id, isTrainerMode);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  // The session waiting behind the "Start Workout Today?" confirm (v1 :1842-1845).
  const [pendingStart, setPendingStart] = useState<ScheduledSession | null>(null);

  // Seed the active-workout store from the prescribed program day, then navigate.
  // Resolves the day from the SAME source the parity law uses (effectiveNext from
  // useActiveClientProgram), or an explicit dayIndex from SwapDayDialog/UpNextCard.
  // Only seeds when no workout is already in progress (resume-existing semantics).
  const handleStart = (dayIndex?: number) => {
    const program = effectiveProgram;
    const next = effectiveNext;
    const store = useActiveWorkoutStore.getState();

    // Don't clobber an in-progress workout — resume it instead.
    if (store.activeWorkout) {
      router.push("/workout/active");
      return;
    }

    const resolvedDayIndex = dayIndex ?? next?.dayIndex;
    if (!program || !user || resolvedDayIndex === undefined || resolvedDayIndex === null) {
      router.push("/workout/active");
      return;
    }

    const day = program.weeklyPlan[resolvedDayIndex];
    if (!day) {
      router.push("/workout/active");
      return;
    }

    const blocks = convertProgramDayToWorkoutBlocks(day, {
      programId: program.id,
      dayIndex: resolvedDayIndex,
      programName: program.name,
      userId: user.id,
    });

    store.startFromTemplate({
      userId: user.id,
      name: `${day.label || "Workout"} - ${program.name}`,
      blocks,
    });

    router.push("/workout/active");
  };

  // Launch the standalone workout builder (ported from v1).
  const handleBuildWorkout = () => {
    router.push("/workout/builder");
  };

  // Start from a session row. On today this starts immediately (unchanged
  // behaviour); on any other day it opens the confirm first (v1 :1838-1849).
  const handleStartSession = (session: ScheduledSession) => {
    if (session.date === today) {
      handleStart(session.dayIndex);
      return;
    }
    setPendingStart(session);
  };

  // Confirmed: start that day's session now and snap the strip back to today
  // (v1 :2235). No write, no re-dating — see StartOnTodayDialog for why.
  const handleConfirmStart = () => {
    const session = pendingStart;
    setPendingStart(null);
    if (!session) return;
    setPickedDate(today);
    handleStart(session.dayIndex);
  };

  // Week chevrons and swipe move the SELECTION; the visible week is derived
  // from it, so the window follows (v1 :292 derives the week from selectedDate).
  const handleShiftWeek = (deltaWeeks: number) => {
    setPickedDate(shiftISODate(selectedDate, deltaWeeks * DAYS_IN_WEEK));
  };

  const handleStepDay = (deltaDays: number) => {
    setPickedDate(shiftISODate(selectedDate, deltaDays));
  };

  const openPreview = (dayIndex: number) => {
    setSwapOpen(false);
    setPreviewIndex(dayIndex);
  };

  const showLoading = isTrainerMode ? trainerData.isLoading : isLoading;
  const showError = isTrainerMode ? trainerData.error : error;

  // Header follows the selection (v1 :439-440).
  const isToday = selectedDate === today;

  return (
    <div>
      <PageHeader
        title={isToday ? "Today" : formatWeekdayLong(selectedDate)}
        subtitle={formatLongDate(selectedDate)}
      />
      <div className="px-5 py-4">
        {/* Mode Toggle — only shown for actual trainers (local view toggle, not a DB role mutation) */}
        {isTrainerRole && !roleLoading && (
          <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200 mb-4">
            <button
              onClick={() => setViewMode("user")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                !isTrainerMode
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              }`
            }
            >
              <Dumbbell className="w-4 h-4" />
              Athlete
            </button>
            <button
              onClick={() => setViewMode("trainer")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                isTrainerMode
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              }`
            }
            >
              <Users className="w-4 h-4" />
              Trainer
            </button>
          </div>
        )}

        {(!identityResolved || showLoading) && (
          <p className="text-center text-gray-500">Loading your day…</p>
        )}
        {showError && (
          <p className="text-center text-red-500">
            Could not load{isTrainerMode ? " trainer data" : " sessions"}:{" "}
            {showError.message}
          </p>
        )}

        {/* Trainer mode surface */}
        {identityResolved && isTrainerMode && !showLoading && !showError && (
          <TrainerTodaySurface
            trainerId={user?.id}
            clients={trainerData.clients}
            isLoading={false}
            error={null}
          />
        )}

        {/* Athlete mode surface */}
        {identityResolved && !isTrainerMode && !isLoading && !error && (
          <TodaySurface
            activeProgram={effectiveProgram}
            next={effectiveNext}
            completedDayIndices={completedDayIndices}
            stats={stats}
            sessions={sessions}
            weekDays={week.days}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={setPickedDate}
            onShiftWeek={handleShiftWeek}
            onStepDay={handleStepDay}
            onOpenCalendar={() => router.push("/calendar")}
            onStartSession={handleStartSession}
            onStartWorkout={handleStart}
            onBuildWorkout={handleBuildWorkout}
            onPreview={openPreview}
            onSwap={() => setSwapOpen(true)}
            onViewHistory={() => router.push("/workouts")}
          />
        )}

        {effectiveProgram && !isTrainerMode && (
          <>
            <PreviewDayDialog
              open={previewIndex !== null}
              day={
                previewIndex !== null
                  ? effectiveProgram.weeklyPlan[previewIndex] ?? null
                  : null
              }
              dayIndex={previewIndex ?? 0}
              programName={effectiveProgram.name}
              onOpenChange={(open) => !open && setPreviewIndex(null)}
            />

            <SwapDayDialog
              open={swapOpen}
              program={effectiveProgram}
              completedDayIndices={completedDayIndices}
              nextDayIndex={effectiveNext?.dayIndex ?? 0}
              onOpenChange={setSwapOpen}
              onStart={handleStart}
              onPreview={openPreview}
            />
          </>
        )}

        {!isTrainerMode && (
          <StartOnTodayDialog
            open={pendingStart !== null}
            sessionDate={pendingStart?.date ?? null}
            onOpenChange={(open) => !open && setPendingStart(null)}
            onCancel={() => setPendingStart(null)}
            onConfirm={handleConfirmStart}
          />
        )}
      </div>
    </div>
  );
}

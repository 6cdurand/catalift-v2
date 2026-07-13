"use client";

// /today — the rich home surface (F2). COMPOSITION, not a from-scratch port: it
// wires the v2 data seams (session + active client program + scheduled sessions +
// workout-history stats) into the presentational <TodaySurface />, which reuses
// the w3 client-program components.
//
// Parity law (BUG-001/010): "Up Next" / next-day come ONLY from
// getNextProgramWorkout via useActiveClientProgram. This file contains NO
// day-index / rotation / weekday / next-index logic (see parity-guard test).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession } from "@/features/auth";
import { useScheduledSessions } from "@/features/calendar";
import { useActiveClientProgram } from "@/features/programs";
import { PreviewDayDialog } from "@/features/programs/client/dialogs/PreviewDayDialog";
import { SwapDayDialog } from "@/features/programs/client/dialogs/SwapDayDialog";
import { TodaySurface } from "./TodaySurface";
import { useTodayStats } from "./useTodayStats";

function formatTodayLabel(today: string): string {
  const d = new Date(today + "T00:00:00");
  return d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const rangeStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { todaySessions, today, isLoading, error } = useScheduledSessions({
    rangeStart,
    rangeEnd: rangeStart,
  });

  const { activeProgram, next, completedDayIndices } = useActiveClientProgram(
    user?.id,
    sessionLoading,
  );

  const { stats } = useTodayStats(user?.id, sessionLoading);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // Same start flow the UpNextCard / ClientProgramPage use (Box 1).
  const handleStart = () => {
    router.push("/workout/active");
  };

  const openPreview = (dayIndex: number) => {
    setSwapOpen(false);
    setPreviewIndex(dayIndex);
  };

  return (
    <div>
      <PageHeader title="Today" subtitle={formatTodayLabel(today)} />
      <div className="px-5 py-4">
        {isLoading && (
          <p className="text-center text-gray-500">Loading your day…</p>
        )}
        {error && (
          <p className="text-center text-red-500">
            Could not load sessions: {error.message}
          </p>
        )}
        {!isLoading && !error && (
          <TodaySurface
            activeProgram={activeProgram}
            next={next}
            completedDayIndices={completedDayIndices}
            stats={stats}
            todaySessions={todaySessions}
            onStartWorkout={handleStart}
            onPreview={openPreview}
            onSwap={() => setSwapOpen(true)}
            onViewHistory={() => router.push("/workout/history")}
          />
        )}

        {activeProgram && (
          <>
            <PreviewDayDialog
              open={previewIndex !== null}
              day={
                previewIndex !== null
                  ? activeProgram.weeklyPlan[previewIndex] ?? null
                  : null
              }
              dayIndex={previewIndex ?? 0}
              programName={activeProgram.name}
              onOpenChange={(open) => !open && setPreviewIndex(null)}
            />

            <SwapDayDialog
              open={swapOpen}
              program={activeProgram}
              completedDayIndices={completedDayIndices}
              nextDayIndex={next?.dayIndex ?? 0}
              onOpenChange={setSwapOpen}
              onStart={handleStart}
              onPreview={openPreview}
            />
          </>
        )}
      </div>
    </div>
  );
}

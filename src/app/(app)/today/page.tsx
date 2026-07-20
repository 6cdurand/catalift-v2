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
import { Dumbbell, Users } from "lucide-react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession, useUserRole } from "@/features/auth";
import { useScheduledSessions } from "@/features/calendar";
import { useActiveClientProgram } from "@/features/programs";
import { PreviewDayDialog } from "@/features/programs/client/dialogs/PreviewDayDialog";
import { SwapDayDialog } from "@/features/programs/client/dialogs/SwapDayDialog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useViewModeStore } from "@/hooks/use-view-mode";
import { TodaySurface } from "./TodaySurface";
import { TrainerTodaySurface } from "./TrainerTodaySurface";
import { useTodayStats } from "./useTodayStats";
import { useTrainerTodayData } from "./useTrainerTodayData";

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
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const { user: authUser } = useAuthUser();
  const setViewMode = useViewModeStore((s) => s.setViewMode);

  const isTrainerRole = role === "trainer";
  const isTrainerMode = authUser?.mode === "trainer";

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

  const trainerData = useTrainerTodayData(user?.id, isTrainerMode);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // Same start flow the UpNextCard / ClientProgramPage use (Box 1).
  const handleStart = () => {
    router.push("/workout/active");
  };

  // Launch the standalone workout builder (ported from v1).
  const handleBuildWorkout = () => {
    router.push("/workout/builder");
  };

  const openPreview = (dayIndex: number) => {
    setSwapOpen(false);
    setPreviewIndex(dayIndex);
  };

  const showLoading = isTrainerMode ? trainerData.isLoading : isLoading;
  const showError = isTrainerMode ? trainerData.error : error;

  return (
    <div>
      <PageHeader title="Today" subtitle={formatTodayLabel(today)} />
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

        {showLoading && (
          <p className="text-center text-gray-500">Loading your day…</p>
        )}
        {showError && (
          <p className="text-center text-red-500">
            Could not load{isTrainerMode ? " trainer data" : " sessions"}:{" "}
            {showError.message}
          </p>
        )}

        {/* Trainer mode surface */}
        {isTrainerMode && !showLoading && !showError && (
          <TrainerTodaySurface
            clients={trainerData.clients}
            stats={trainerData.stats}
            recentCompletions={trainerData.recentCompletions}
            isLoading={false}
            error={null}
          />
        )}

        {/* Athlete mode surface */}
        {!isTrainerMode && !isLoading && !error && (
          <TodaySurface
            activeProgram={activeProgram}
            next={next}
            completedDayIndices={completedDayIndices}
            stats={stats}
            todaySessions={todaySessions}
            onStartWorkout={handleStart}
            onBuildWorkout={handleBuildWorkout}
            onPreview={openPreview}
            onSwap={() => setSwapOpen(true)}
            onViewHistory={() => router.push("/workouts")}
          />
        )}

        {activeProgram && !isTrainerMode && (
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

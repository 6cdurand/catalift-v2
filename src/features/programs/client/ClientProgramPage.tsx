"use client";

// w3 — the client's view of their assigned/active program.
//
// The RECIPIENT half of the parity law: it renders the SAME canonical
// ClientProgram the builder (w2) wrote, and derives "Up Next" ONLY from
// getNextProgramWorkout (via useActiveClientProgram). This component contains
// NO next-day / rotation / day-index arithmetic (BUG-001/010 divergence guard).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession } from "@/features/auth";
import { convertProgramDayToWorkoutBlocks } from "@/lib/programStartUtils";
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { useActiveWorkoutStore } from "@/features/workout-engine/stores/active-workout-store";
import { useActiveClientProgram } from "./useActiveClientProgram";
import { ProgramSummaryCard } from "./components/ProgramSummaryCard";
import { UpNextCard } from "./components/UpNextCard";
import { WeeklyProgressStrip } from "./components/WeeklyProgressStrip";
import { ProgramDayView } from "./components/ProgramDayView";
import { PreviewDayDialog } from "./dialogs/PreviewDayDialog";
import { SwapDayDialog } from "./dialogs/SwapDayDialog";

export function ClientProgramPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { activeProgram, next, completedDayIndices, isLoading, error } =
    useActiveClientProgram(user?.id, sessionLoading);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  const isSelfAuthored = !!(
    activeProgram && user && activeProgram.trainerId === user.id
  );

  // Start a program day → seed the active-workout store from the prescribed day,
  // then navigate to /workout/active. Only seeds when no workout is in progress
  // (resume-existing semantics — don't clobber an in-progress session).
  const handleStart = (dayIndex?: number) => {
    const program = activeProgram;
    const store = useActiveWorkoutStore.getState();

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

  const openPreview = (dayIndex: number) => {
    setSwapOpen(false);
    setPreviewIndex(dayIndex);
  };

  return (
    <div>
      <PageHeader title="Program" subtitle="Your training plan" />
      <div className="px-5 py-4">
        {sessionLoading || isLoading ? (
          <p className="text-center text-gray-500">Loading your program…</p>
        ) : error ? (
          <p className="text-center text-red-500">
            Could not load your program: {error.message}
          </p>
        ) : !activeProgram ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-600">No active program</p>
            <p className="mt-1 text-xs text-gray-400">
              Your trainer hasn&apos;t assigned a program yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ProgramSummaryCard
              program={activeProgram}
              isSelfAuthored={isSelfAuthored}
              onEdit={() =>
                router.push(`/program/builder?clientId=${user?.id ?? ""}`)
              }
              onMessageTrainer={() =>
                router.push(`/messages?with=${activeProgram.trainerId}`)
              }
            />

            {next && (
              <UpNextCard
                program={activeProgram}
                next={next}
                onStart={handleStart}
                onPreview={openPreview}
                onSwap={() => setSwapOpen(true)}
              />
            )}

            {next && (
              <WeeklyProgressStrip
                program={activeProgram}
                completedDayIndices={completedDayIndices}
                lockedDayIndices={next.lockedDayIndices}
                nextDayIndex={next.dayIndex}
              />
            )}

            {activeProgram.weeklyPlan.length > 0 ? (
              <div className="space-y-3">
                {activeProgram.weeklyPlan.map((day, idx) => (
                  <ProgramDayView key={day.id} day={day} dayIndex={idx} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">
                No training days in this program yet.
              </p>
            )}

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
          </div>
        )}
      </div>
    </div>
  );
}

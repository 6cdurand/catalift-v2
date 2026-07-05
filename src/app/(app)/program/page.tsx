"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession } from "@/features/auth";
import {
  fetchClientProgramsForClient,
  useProgramsStore,
  type ClientProgram,
  type ProgramDay,
  type ProgramBlock,
  type ProgramExercise,
} from "@/features/programs";
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import { getBlockStyles, getBlockTypeMeta } from "@/features/workout-engine/components/block-types";

function ExerciseRow({ exercise }: { exercise: ProgramExercise }) {
  return (
    <div className="flex items-center justify-between py-2 px-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {exercise.exerciseName}
        </p>
        {exercise.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{exercise.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 ml-2 shrink-0">
        <span className="tabular-nums">{exercise.sets} × {exercise.reps}</span>
        <span className="text-gray-300">|</span>
        <span>{exercise.rest}</span>
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: ProgramBlock }) {
  const styles = getBlockStyles(block.type);
  const meta = getBlockTypeMeta(block.type);

  return (
    <div className={`rounded-md border ${styles.border} bg-white overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className={`w-1 h-4 rounded-full ${styles.accent}`} />
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
          {meta?.label ?? block.type}
        </span>
        <span className="text-sm font-medium text-gray-700">{block.name}</span>
      </div>
      {block.exercises.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {block.exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 px-3 py-3">No exercises</p>
      )}
    </div>
  );
}

function DayCard({ day, dayIndex }: { day: ProgramDay; dayIndex: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Day {dayIndex + 1}: {day.label}
          </p>
          {day.scheduledDay && (
            <p className="text-xs text-gray-400 capitalize mt-0.5">
              {day.scheduledDay}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {day.blocks.length} {day.blocks.length === 1 ? "block" : "blocks"}
        </span>
      </div>
      {day.blocks.length > 0 ? (
        <div className="p-3 space-y-2">
          {day.blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 px-4 py-3">No blocks assigned</p>
      )}
    </div>
  );
}

export default function ProgramPage() {
  const { user, loading: sessionLoading } = useSession();
  const { clientPrograms, hydrateClientPrograms } = useProgramsStore();
  const [fetchState, setFetchState] = useState<{ loading: boolean; error: Error | null }>({
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (sessionLoading || !user) return;
    let cancelled = false;
    fetchClientProgramsForClient(user.id)
      .then((programs) => {
        if (cancelled) return;
        hydrateClientPrograms(programs);
        setFetchState({ loading: false, error: null });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setFetchState({ loading: false, error: err });
      });
    return () => {
      cancelled = true;
    };
  }, [user, sessionLoading, hydrateClientPrograms]);

  const activeProgram: ClientProgram | undefined = clientPrograms.find(
    (p) => p.status === "active",
  );

  return (
    <div>
      <PageHeader title="Program" subtitle="Your training plan" />
      <div className="px-5 py-4">
        {sessionLoading || fetchState.loading ? (
          <p className="text-center text-gray-500">Loading your program…</p>
        ) : fetchState.error ? (
          <p className="text-center text-red-500">
            Could not load your program: {fetchState.error.message}
          </p>
        ) : !activeProgram ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-600">No program assigned yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Your trainer hasn&apos;t assigned a program. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{activeProgram.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {activeProgram.phase.replace("_", " ")} · {activeProgram.goal.replace("_", " ")}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  activeProgram.scheduleMode === "fixed"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {activeProgram.scheduleMode}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>{activeProgram.trainingDaysPerWeek} days/week</span>
                {activeProgram.scheduleMode === "fixed" && activeProgram.selectedDays.length > 0 && (
                  <span className="capitalize">
                    {activeProgram.selectedDays.join(", ")}
                  </span>
                )}
              </div>
            </div>

            {activeProgram.weeklyPlan.length > 0 ? (
              <div className="space-y-3">
                {activeProgram.weeklyPlan.map((day, idx) => (
                  <DayCard key={day.id} day={day} dayIndex={idx} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">
                No training days in this program yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

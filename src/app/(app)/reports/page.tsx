"use client";

/**
 * /reports — Weekly report route (v2 port)
 *
 * Ported from v1 /reports page (src/app/reports/page.tsx) — faithful UI on the
 * v2 light shell. Data computed on-demand from existing v2 seams:
 *   - fetchWorkoutHistoryWithBlocks (workout-engine/api/fetch-history)
 *   - fetchPersonalBests (workout-engine/api/fetch-personal-bests)
 *
 * No persistence — report regenerated each load (guardrail: no localStorage for
 * domain data). strengthRating flag stays OFF; no strength-tier block rendered.
 */

import { useState, useEffect, useMemo } from "react";
import { useSession } from "@/features/auth";
import { MainLayout, PageHeader } from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState, EmptyState } from "@/components/states";
import { fetchWorkoutHistoryWithBlocks } from "@/features/workout-engine/api/fetch-history";
import { fetchPersonalBests } from "@/features/workout-engine/api/fetch-personal-bests";
import { getMuscleDisplayName } from "@/lib/exercises";
import { generateWeeklyReport } from "@/lib/reports/weekly-report";
import type { WorkoutHistoryBlocks } from "@/features/workout-engine/api/fetch-history";
import type { PersonalBestItem } from "@/features/workout-engine/api/fetch-personal-bests";
import type { MuscleGroup } from "@/types";
import { format } from "date-fns";
import {
  Dumbbell,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  Flame,
} from "lucide-react";

export default function ReportsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [history, setHistory] = useState<WorkoutHistoryBlocks[]>([]);
  const [pbs, setPbs] = useState<PersonalBestItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [hist, pbList] = await Promise.all([
          fetchWorkoutHistoryWithBlocks(user.id, 50).catch(() => []),
          fetchPersonalBests(user.id, 100).catch(() => []),
        ]);
        if (cancelled) return;
        setHistory(hist);
        setPbs(pbList);
      } catch (err) {
        console.error("[ReportsPage] failed to load data:", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const report = useMemo(
    () => generateWeeklyReport(history, pbs),
    [history, pbs],
  );

  const weekStart = new Date(report.weekStartDate);
  const weekEnd = new Date(report.weekEndDate);
  const maxVolume =
    report.topMuscles.length > 0 ? report.topMuscles[0].volume : 1;

  const subtitle = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <MainLayout>
      <PageHeader title="Weekly Report" subtitle={subtitle} />

      <div className="px-5 py-4 space-y-4">
        {sessionLoading || loadingData ? (
          <LoadingState message="Loading your weekly report…" />
        ) : report.totalWorkouts === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No workouts this week"
            description="Complete a workout to see your weekly report with volume breakdown, consistency score, and personal bests."
            accentColor="sky"
          />
        ) : (
          <>
            {/* Week Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-linear-to-br from-sky-50 to-sky-100/50 border-sky-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {report.totalWorkouts}
                      </p>
                      <p className="text-sm text-gray-500">Workouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {report.totalVolume >= 1000
                          ? `${Math.round(report.totalVolume / 1000)}k`
                          : report.totalVolume}
                      </p>
                      <p className="text-sm text-gray-500">Volume (kg)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {report.totalDurationMinutes}
                      </p>
                      <p className="text-sm text-gray-500">Minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-amber-50 to-amber-100/50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {report.newPBsThisWeek.length}
                      </p>
                      <p className="text-sm text-gray-500">New PBs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Volume by Muscle Group */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-500" />
                  Volume by Muscle Group
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.topMuscles.length === 0 ? (
                  <div className="text-center py-8">
                    <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No workout data this week</p>
                    <p className="text-sm text-gray-400">
                      Complete workouts to see your volume breakdown
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {report.topMuscles.map(({ muscle, volume }) => (
                      <div key={muscle} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {getMuscleDisplayName(muscle as MuscleGroup)}
                          </span>
                          <span className="text-gray-900 font-medium">
                            {Math.round(volume).toLocaleString()} kg
                          </span>
                        </div>
                        <Progress
                          value={(volume / maxVolume) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consistency Score */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Consistency Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-gray-200"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${Math.min(report.consistencyScore, 100) * 2.51} 251`}
                        className="text-sky-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">
                        {report.consistencyScore}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 mb-2">
                      You completed{" "}
                      <span className="text-sky-500 font-semibold">
                        {report.totalWorkouts}
                      </span>{" "}
                      workouts this week.
                    </p>
                    <p className="text-sm text-gray-500">
                      {report.totalWorkouts >= 5
                        ? "Excellent consistency! Keep it up!"
                        : report.totalWorkouts >= 3
                          ? "Good progress! Try to add one more session."
                          : "Build momentum by scheduling more workouts."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent PBs */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Recent Personal Bests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pbs.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No personal bests yet</p>
                    <p className="text-sm text-gray-400">
                      Keep pushing to set new records
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pbs.slice(0, 5).map((pb) => (
                      <div
                        key={pb.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {pb.exerciseName ??
                                pb.exerciseId.replace(/-/g, " ")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(pb.achievedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-500">
                            {Math.round(pb.oneRepMax)}kg
                          </p>
                          <p className="text-xs text-gray-400">1RM</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}

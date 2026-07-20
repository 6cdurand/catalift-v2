"use client";

/**
 * Workout detail page — Phase-2 Lane 3a (L3a)
 * Port of v1 workout/[id]/page.tsx (simplified)
 * - Shows completed workout details (blocks, sets, volume, stats)
 * - Light shell theme (sky/rose tokens)
 * - Read-only view (no edit/delete in v2 MVP)
 */

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/states";
import { useSession } from "@/features/auth";
import {
  fetchWorkoutById,
  type WorkoutDetail,
} from "@/features/workout-engine/api/fetch-history";

interface PageProps {
  params: Promise<{ id: string }>;
}



export default function WorkoutDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { user } = useSession();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function loadWorkout() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWorkoutById(id);
        if (!data) {
          setError("Workout not found");
          return;
        }
        setWorkout(data);
      } catch (err) {
        console.error("Error loading workout:", err);
        setError("Failed to load workout");
      } finally {
        setLoading(false);
      }
    }

    loadWorkout();
  }, [id, user?.id]);

  if (loading) {
    return <LoadingState label="Loading workout..." />;
  }

  if (error || !workout) {
    return (
      <ErrorState
        title="Unable to load workout"
        description={error || "Workout not found"}
        onRetry={() => router.push("/workouts")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3">
        <button
          onClick={() => router.push("/workouts")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to History</span>
        </button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Workout Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {workout.name || "Workout"}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(workout.performedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <Dumbbell className="w-5 h-5 mx-auto mb-1 text-rose-500" />
              <p className="text-2xl font-bold text-gray-900">{workout.totalSets}</p>
              <p className="text-xs text-gray-500">Sets</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold text-gray-900">
                {workout.totalVolume.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Volume (kg)</p>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {workout.notes && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {workout.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Workout Blocks */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Exercises</h3>
          {workout.blocks.map((block, blockIndex) => (
            <Card key={blockIndex} className="bg-white border-gray-200">
              <CardContent className="p-4">
                {block.kind === "straight" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        {block.exercise.exerciseName}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {block.exercise.sets.filter((s) => s.completed).length} sets
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {block.exercise.sets
                        .filter((s) => s.completed)
                        .map((set, setIndex) => (
                          <div
                            key={setIndex}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-sm text-gray-600">
                              Set {setIndex + 1}
                            </span>
                            <div className="flex items-center gap-4">
                              {set.weight !== null && (
                                <span className="text-sm font-medium text-gray-900">
                                  {set.weight}kg
                                </span>
                              )}
                              {set.reps !== null && (
                                <span className="text-sm text-gray-600">
                                  {set.reps} reps
                                </span>
                              )}
                              {set.durationSeconds !== null && set.durationSeconds !== undefined && (
                                <span className="text-sm text-gray-600">
                                  {set.durationSeconds}s
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {block.kind === "superset" && (
                  <div className="space-y-4">
                    <Badge className="bg-purple-100 text-purple-700 border-0">
                      Superset
                    </Badge>
                    {block.exercises.map((ex, exIndex) => (
                      <div key={exIndex} className="space-y-2">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {ex.exerciseName}
                        </h4>
                        <div className="space-y-1 pl-4">
                          {ex.sets
                            .filter((s) => s.completed)
                            .map((set, setIndex) => (
                              <div
                                key={setIndex}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-600">
                                  Set {setIndex + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                  {set.weight !== null && (
                                    <span className="font-medium text-gray-900">
                                      {set.weight}kg
                                    </span>
                                  )}
                                  {set.reps !== null && (
                                    <span className="text-gray-600">
                                      {set.reps} reps
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {block.kind === "circuit" && (
                  <div className="space-y-4">
                    <Badge className="bg-amber-100 text-amber-700 border-0">
                      Circuit
                    </Badge>
                    {block.stations.map((station, stIndex) => (
                      <div key={stIndex} className="space-y-2">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {station.exerciseName}
                        </h4>
                        <div className="space-y-1 pl-4">
                          {station.sets
                            .filter((s) => s.completed)
                            .map((set, setIndex) => (
                              <div
                                key={setIndex}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-600">
                                  Round {setIndex + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                  {set.weight !== null && (
                                    <span className="font-medium text-gray-900">
                                      {set.weight}kg
                                    </span>
                                  )}
                                  {set.reps !== null && (
                                    <span className="text-gray-600">
                                      {set.reps} reps
                                    </span>
                                  )}
                                  {set.durationSeconds !== null && set.durationSeconds !== undefined && (
                                    <span className="text-gray-600">
                                      {set.durationSeconds}s
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back Button (bottom) */}
        <Button
          onClick={() => router.push("/workouts")}
          variant="outline"
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>
      </div>
    </div>
  );
}

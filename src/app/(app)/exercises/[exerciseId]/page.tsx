"use client";

/**
 * Exercise detail page — Phase-2 Lane 2
 * Simplified port of v1 exercises/[exerciseId]/page.tsx
 * - Light shell theme
 * - Shows exercise info without strength tier dependency
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Info } from "lucide-react";
import { allExercises } from "@/lib/exercises";

interface PageProps {
  params: Promise<{ exerciseId: string }>;
}

export default function ExerciseDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { exerciseId } = use(params);

  const exercise = allExercises.find((ex) => ex.id === exerciseId);

  if (!exercise) {
    return (
      <div>
        <PageHeader title="Exercise Not Found" />
        <div className="px-4 py-12 text-center">
          <Dumbbell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">Exercise not found</p>
          <Button onClick={() => router.push("/exercises")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exercises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3">
        <button
          onClick={() => router.push("/exercises")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{exercise.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {exercise.category && (
              <Badge className="bg-sky-100 text-sky-700 border-0">
                {exercise.category}
              </Badge>
            )}
            {exercise.equipment && (
              <Badge variant="outline" className="text-gray-600">
                {exercise.equipment}
              </Badge>
            )}
          </div>
        </div>

        {/* Muscle Groups */}
        {(exercise.primaryMuscles || exercise.secondaryMuscles) && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-sky-500" />
                Muscle Groups
              </h3>
              <div className="space-y-2">
                {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Primary</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.primaryMuscles.map((muscle) => (
                        <Badge
                          key={muscle}
                          className="bg-sky-500 text-white border-0"
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Secondary</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.secondaryMuscles.map((muscle) => (
                        <Badge
                          key={muscle}
                          variant="outline"
                          className="text-gray-600"
                        >
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {exercise.instructions && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-500" />
                How To Perform
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {exercise.instructions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Alternatives */}
        {exercise.alternatives && exercise.alternatives.length > 0 && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Alternatives</h3>
              <div className="space-y-2">
                {exercise.alternatives.map((altId) => {
                  const alt = allExercises.find((ex) => ex.id === altId);
                  if (!alt) return null;
                  return (
                    <button
                      key={altId}
                      onClick={() => router.push(`/exercises/${altId}`)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sky-300 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{alt.name}</p>
                      {alt.equipment && (
                        <p className="text-xs text-gray-500 mt-1">{alt.equipment}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

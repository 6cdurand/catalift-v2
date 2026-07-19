"use client";

/**
 * Exercises page — Phase-2 Lane 2
 * Port of v1 exercises/page.tsx with:
 * - Light shell (sky/rose tokens, not v1 dark theme)
 * - Gracefully hides strength tiers when feature flag OFF
 * - Sources from existing lib/exercises.ts
 */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Dumbbell, ChevronRight } from "lucide-react";
import { allExercises } from "@/lib/exercises";

export default function ExercisesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Get all exercises from lib
  const exercises = useMemo(() => {
    return allExercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      category: ex.category,
      equipment: ex.equipment,
      primaryMuscles: ex.primaryMuscles,
    }));
  }, []);

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.id.includes(query) ||
        e.category?.toLowerCase().includes(query) ||
        e.equipment?.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  // Group by category
  const byCategory = useMemo(() => {
    const groups: Record<string, typeof exercises> = {};
    filteredExercises.forEach((ex) => {
      const cat = ex.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ex);
    });
    return groups;
  }, [filteredExercises]);

  const categoryOrder = ["compound", "isolation", "cardio", "other"];
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a);
    const bIdx = categoryOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div>
      <PageHeader
        title="Exercises"
        subtitle="Browse the exercise library"
      />

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white border-gray-200 h-12 rounded-xl"
          />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <Dumbbell className="w-5 h-5 mx-auto mb-1 text-sky-500" />
              <p className="text-2xl font-bold text-gray-900">{exercises.length}</p>
              <p className="text-xs text-gray-500">Total Exercises</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4 text-center">
              <Search className="w-5 h-5 mx-auto mb-1 text-rose-500" />
              <p className="text-2xl font-bold text-gray-900">{filteredExercises.length}</p>
              <p className="text-xs text-gray-500">Showing</p>
            </CardContent>
          </Card>
        </div>

        {/* Exercise List by Category */}
        {sortedCategories.map((category) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">
              {category.charAt(0).toUpperCase() + category.slice(1)} ({byCategory[category].length})
            </h3>
            <div className="space-y-2">
              {byCategory[category].map((exercise) => (
                <Card
                  key={exercise.id}
                  className="bg-white border-gray-200 hover:border-sky-300 transition-all cursor-pointer"
                  onClick={() => router.push(`/exercises/${exercise.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{exercise.name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {exercise.equipment && (
                            <Badge variant="outline" className="text-xs text-gray-600">
                              {exercise.equipment}
                            </Badge>
                          )}
                          {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
                            <Badge variant="outline" className="text-xs text-gray-600">
                              {exercise.primaryMuscles[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No exercises found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

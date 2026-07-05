"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession } from "@/features/auth";
// eslint-disable-next-line no-restricted-imports -- app/ pages may import from features
import {
  fetchWorkoutHistory,
  type WorkoutHistoryItem,
} from "@/features/workout-engine/api/fetch-history";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k kg`;
  return `${vol} kg`;
}

function WorkoutCard({ item }: { item: WorkoutHistoryItem }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {item.name || "Workout"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(item.performedAt)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-right shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {formatVolume(item.totalVolume)}
            </p>
            <p className="text-[10px] uppercase text-gray-400">Volume</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {item.totalSets}
            </p>
            <p className="text-[10px] uppercase text-gray-400">Sets</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;

    async function load() {
      try {
        const items = await fetchWorkoutHistory(user!.id, 20);
        if (!cancelled) {
          setHistory(items);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Workouts" subtitle="Your training history" />
        <div className="px-5 py-16 text-center text-gray-500">
          <p className="text-body">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Workouts" subtitle="Your training history" />
      <div className="px-5 py-4">
        <button
          onClick={() => router.push("/workout/active")}
          className="w-full rounded-xl bg-linear-to-r from-sky-500 to-sky-600 px-4 py-4 text-white font-semibold shadow-lg shadow-sky-500/20 transition-all hover:from-sky-600 hover:to-sky-700 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Start Workout
        </button>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recent
          </h2>

          {isLoading && (
            <p className="text-center text-gray-500">Loading workouts…</p>
          )}

          {error && (
            <p className="text-center text-red-500">
              Could not load workouts: {error.message}
            </p>
          )}

          {!isLoading && !error && history.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-sm font-medium text-gray-600">
                No workouts logged yet
              </p>
              <p className="mt-1 text-xs text-gray-400">Start your first!</p>
            </div>
          )}

          {!isLoading && !error && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item) => (
                <WorkoutCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

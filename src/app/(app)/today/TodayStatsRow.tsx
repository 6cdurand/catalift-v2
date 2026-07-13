"use client";

// Today's stats row — ported from v1 Today (4-up: streak / this week / sets /
// volume). Presentational only: values are computed upstream by computeTodayStats
// (workout history) and passed in. Matches the light, gray-50 tile look of the
// rest of the Today surface.

import { Flame, Dumbbell, ListChecks, TrendingUp } from "lucide-react";
import { formatVolume, type TodayStats } from "./today-stats";

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

export function TodayStatsRow({ stats }: { stats: TodayStats }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <StatTile
        icon={<Flame className="w-4 h-4 text-orange-400" />}
        value={stats.weekStreak}
        label="Week Streak"
      />
      <StatTile
        icon={<Dumbbell className="w-4 h-4 text-sky-500" />}
        value={stats.sessionsThisWeek}
        label="This Week"
      />
      <StatTile
        icon={<ListChecks className="w-4 h-4 text-purple-400" />}
        value={stats.setsThisWeek}
        label="Sets"
      />
      <StatTile
        icon={<TrendingUp className="w-4 h-4 text-green-400" />}
        value={formatVolume(stats.volumeThisWeek)}
        label="Volume"
      />
    </div>
  );
}

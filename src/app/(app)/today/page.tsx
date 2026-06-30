"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useScheduledSessions } from "@/features/calendar";
import type { ScheduledSession } from "@/features/calendar";

function formatTodayLabel(today: string): string {
  const d = new Date(today + "T00:00:00");
  return d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SessionCard({ session }: { session: ScheduledSession }) {
  const statusColor: Record<string, string> = {
    done: "border-green-200 bg-green-50 text-green-700",
    upcoming: "border-blue-200 bg-blue-50 text-blue-700",
    missed: "border-red-200 bg-red-50 text-red-600",
    rest: "border-gray-200 bg-gray-50 text-gray-500",
  };

  return (
    <div
      className={`rounded-lg border p-4 ${statusColor[session.status] ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{session.label}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {session.kind.replace("-", " ")}
            {session.sessionType ? ` · ${session.sessionType}` : ""}
          </p>
        </div>
        <span className="text-xs font-medium uppercase">{session.status}</span>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const rangeStart = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { todaySessions, today, isLoading, error } = useScheduledSessions({
    rangeStart,
    rangeEnd: rangeStart,
  });

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
        {!isLoading && !error && todaySessions.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm font-medium text-gray-600">Rest Day</p>
            <p className="mt-1 text-xs text-gray-400">
              No training scheduled for today. Enjoy the recovery!
            </p>
          </div>
        )}
        {!isLoading && !error && todaySessions.length > 0 && (
          <div className="space-y-3">
            {todaySessions.map((session, i) => (
              <SessionCard key={`${session.date}-${i}`} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useScheduledSessions, CalendarGrid } from "@/features/calendar";
import type { ScheduledSession } from "@/features/calendar";

function formatSelectedLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function CalendarPage() {
  // Range = current month ± 1 month for smooth nav (no refetch per month switch).
  const rangeStart = useMemo(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`;
  }, []);

  const rangeEnd = useMemo(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  }, []);

  const { sessions, today, isLoading, error } = useScheduledSessions({
    rangeStart,
    rangeEnd,
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<ScheduledSession[]>([]);

  const handleSelectDay = (date: string, daySessions: ScheduledSession[]) => {
    setSelectedDate(date);
    setSelectedSessions(daySessions);
  };

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your training schedule" />
      <div className="px-5 py-4">
        {isLoading && (
          <p className="text-center text-gray-500">Loading calendar…</p>
        )}
        {error && (
          <p className="text-center text-red-500">
            Could not load calendar: {error.message}
          </p>
        )}
        {!isLoading && !error && (
          <>
            <CalendarGrid
              sessions={sessions}
              today={today}
              onSelectDay={handleSelectDay}
            />

            {selectedDate && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium">
                  {formatSelectedLabel(selectedDate)}
                </p>
                {selectedSessions.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">Rest day</p>
                    <p className="mt-1 text-xs text-gray-400">
                      No training scheduled.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSessions.map((s, i) => (
                      <div
                        key={`${s.date}-${i}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div>
                          <p className="font-medium">{s.label}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {s.kind.replace("-", " ")}
                            {s.sessionType ? ` · ${s.sessionType}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

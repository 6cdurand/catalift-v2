"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useScheduledSessions, CalendarGrid } from "@/features/calendar";

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
          <CalendarGrid sessions={sessions} today={today} />
        )}
      </div>
    </div>
  );
}

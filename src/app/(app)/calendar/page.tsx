"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { useSession } from "@/features/auth";
import { useScheduledSessions, CalendarGrid } from "@/features/calendar";
import { useActiveClientProgram } from "@/features/programs";

export default function CalendarPage() {
  const { user, loading: sessionLoading } = useSession();

  // Hydrate the programs store on mount — same hook /today uses.
  // useScheduledSessions reads activeProgram from the store; without this,
  // a direct load of /calendar (hard refresh / 2nd device) renders an empty grid.
  useActiveClientProgram(user?.id, sessionLoading);

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
          <CalendarGrid
            sessions={sessions}
            today={today}
            // TODO(A1): open the Add Event dialog prefilled with (date, hour)
            // once calendar_events exists (B1) and the booking UI ships.
            onSlotClick={() => {}}
          />
        )}
      </div>
    </div>
  );
}

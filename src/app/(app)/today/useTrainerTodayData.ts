"use client";

// Trainer Today roster hook — the page-level loading/error gate for trainer
// mode, plus the roster the surface needs for its "no clients yet" empty state.
//
// The `recentCompletions` feed and the roster `stats` were REMOVED with the
// Today redesign (Christo 2026-07-28: roster detail belongs on /clients, Today
// is schedule only). The `workouts` query that fed them moved into
// useTrainerWeekSchedule, where it is scoped to the visible week instead of
// "the 10 most recent rows".

import { useEffect, useState } from "react";
import { fetchClients } from "@/lib/roster";
import type { RosterClientDetail } from "@/types/roster";

export interface TrainerTodayData {
  clients: RosterClientDetail[];
  isLoading: boolean;
  error: Error | null;
}

export function useTrainerTodayData(
  trainerId: string | undefined,
  enabled: boolean,
): TrainerTodayData {
  const [clients, setClients] = useState<RosterClientDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!trainerId || !enabled) return;
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchClients();
        if (cancelled) return;
        setClients(result.clients);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [trainerId, enabled]);

  return { clients, isLoading, error };
}

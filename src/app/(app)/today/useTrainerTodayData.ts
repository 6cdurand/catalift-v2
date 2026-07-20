"use client";

// Trainer Today data hook — fetches the trainer's roster and recent client
// workout completions using existing v2 data seams (fetchClients + workouts
// table with are_connected RLS). No schema changes, no new tables.

import { useEffect, useState } from "react";
import { fetchClients } from "@/lib/roster";
import { getBrowserClient } from "@/lib/supabase";
import type { RosterClientDetail, RosterStats } from "@/types/roster";

export interface ClientCompletion {
  id: string;
  clientName: string;
  workoutName: string;
  performedAt: string;
  clientId: string;
}

export interface TrainerTodayData {
  clients: RosterClientDetail[];
  stats: RosterStats;
  recentCompletions: ClientCompletion[];
  isLoading: boolean;
  error: Error | null;
}

interface ClientNameMap {
  [clientId: string]: { name: string };
}

export function useTrainerTodayData(
  trainerId: string | undefined,
  enabled: boolean,
): TrainerTodayData {
  const [clients, setClients] = useState<RosterClientDetail[]>([]);
  const [stats, setStats] = useState<RosterStats>({
    active: 0,
    pending: 0,
    total: 0,
  });
  const [recentCompletions, setRecentCompletions] = useState<
    ClientCompletion[]
  >([]);
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
        setStats(result.stats);

        const nameMap: ClientNameMap = {};
        for (const c of result.clients) {
          nameMap[c.id] = { name: c.name };
        }

        const clientIds = result.clients.map((c) => c.id);
        let completions: ClientCompletion[] = [];

        if (clientIds.length > 0) {
          const supabase = getBrowserClient();
          const { data, error: workoutsError } = await supabase
            .from("workouts")
            .select("id, name, performed_at, user_id")
            .in("user_id", clientIds)
            .order("performed_at", { ascending: false })
            .limit(10);

          if (!workoutsError && data) {
            completions = (data as Array<{
              id: string;
              name: string | null;
              performed_at: string;
              user_id: string;
            }>).map((row) => ({
              id: row.id,
              clientName: nameMap[row.user_id]?.name ?? "Unknown",
              workoutName: row.name ?? "Workout",
              performedAt: row.performed_at,
              clientId: row.user_id,
            }));
          }
        }

        if (!cancelled) {
          setRecentCompletions(completions);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [trainerId, enabled]);

  return { clients, stats, recentCompletions, isLoading, error };
}

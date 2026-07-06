"use client";

import { getBrowserClient } from "@/lib/supabase";
import type {
  RosterClient,
  RosterClientDetail,
  RosterResult,
} from "@/types/roster";

type TrainerClientRow = {
  id: string;
  client_id: string;
  status: string;
  client: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  } | null;
};

type WorkoutRow = {
  user_id: string;
  performed_at: string;
};

export async function fetchRoster(): Promise<RosterClient[]> {
  const supabase = getBrowserClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("trainer_clients")
    .select(`
      id,
      client_id,
      status,
      client:users!trainer_clients_client_id_fkey(id, full_name, email)
    `)
    .eq("trainer_id", user.id)
    .eq("status", "active");

  if (error) throw error;

  if (!data) return [];

  return (data as TrainerClientRow[]).map((row) => ({
    id: row.client_id,
    name: row.client?.full_name || "Unknown",
    email: row.client?.email || "",
    status: row.status,
  }));
}

/**
 * fetchClients — the Clients screen data source.
 *
 * Returns the trainer's FULL roster (all statuses, not just active) plus
 * per-client session count / last-seen derived from `public.workouts`, and
 * the active/pending/total stats.
 *
 * Trainer-ops rule #2 (client count authority): the counts are derived from a
 * SINGLE database query result (`trainer_clients` scoped to `trainer_id`), not
 * from a competing client-side store. Session data comes from `workouts`,
 * which a connected trainer may read under the `workouts_select_self_or_trainer`
 * RLS policy (`are_connected(auth.uid(), user_id)`).
 */
export async function fetchClients(): Promise<RosterResult> {
  const supabase = getBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("trainer_clients")
    .select(
      `
      id,
      client_id,
      status,
      client:users!trainer_clients_client_id_fkey(id, full_name, email, avatar_url)
    `,
    )
    .eq("trainer_id", user.id);

  if (error) throw error;

  const rows = (data ?? []) as TrainerClientRow[];

  // Derive session count + last-seen per client from the workouts table.
  const clientIds = rows.map((row) => row.client_id);
  const sessionMap = new Map<string, { count: number; last: string | null }>();

  if (clientIds.length > 0) {
    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select("user_id, performed_at")
      .in("user_id", clientIds);

    // Session enrichment is BEST-EFFORT (mirrors workout-engine's "history is
    // best-effort" pattern): a workouts read error must NOT blank the roster.
    // Clients still render with sessions=0 / lastSeen=null if workouts is
    // unavailable; the map is only populated when the query succeeds.
    if (!workoutsError) {
      for (const w of (workouts ?? []) as WorkoutRow[]) {
        const current = sessionMap.get(w.user_id) ?? { count: 0, last: null };
        current.count += 1;
        if (!current.last || new Date(w.performed_at) > new Date(current.last)) {
          current.last = w.performed_at;
        }
        sessionMap.set(w.user_id, current);
      }
    }
  }

  const clients: RosterClientDetail[] = rows.map((row) => {
    const s = sessionMap.get(row.client_id) ?? { count: 0, last: null };
    return {
      id: row.client_id,
      name: row.client?.full_name || "Unknown",
      email: row.client?.email || "",
      status: row.status,
      avatarUrl: row.client?.avatar_url ?? null,
      sessions: s.count,
      lastSeen: s.last,
    };
  });

  return {
    clients,
    stats: {
      active: clients.filter((c) => c.status === "active").length,
      pending: clients.filter((c) => c.status === "pending").length,
      total: clients.length,
    },
  };
}

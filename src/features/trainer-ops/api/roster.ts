"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { RosterClient } from "@/types/roster";

type TrainerClientRow = {
  id: string;
  client_id: string;
  status: string;
  client: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
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

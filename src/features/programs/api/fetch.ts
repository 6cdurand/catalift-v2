"use client";

// Reads for hydration. Every query is user-scoped (G-12 / data-sync rule #5):
// saved programs and trainer-side client programs scope by `trainer_id`; the
// client-side read scopes by `client_id`. No unscoped "fetch all" queries.

import { getBrowserClient } from "@/lib/supabase";
import { rowToClientProgram, rowToSavedProgram } from "../lib/serialize";
import type { ClientProgram, SavedProgram } from "../types";

export async function fetchSavedPrograms(
  trainerId: string,
): Promise<SavedProgram[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("saved_programs")
    .select()
    .eq("trainer_id", trainerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSavedProgram);
}

export async function fetchClientProgramsForTrainer(
  trainerId: string,
): Promise<ClientProgram[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("client_programs")
    .select()
    .eq("trainer_id", trainerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToClientProgram);
}

export async function fetchClientProgramsForClient(
  clientId: string,
): Promise<ClientProgram[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("client_programs")
    .select()
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToClientProgram);
}

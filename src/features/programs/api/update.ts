"use client";

// Updates routed through `persist` (await + retry, no fire-and-forget).
// - updateSavedProgram: edit an existing template.
// - updateClientProgramProgress: advance next_workout_index / change status /
//   set end_date as the client progresses through an assigned program.

import { persist, type SyncResult } from "@/features/data-sync";
import { getBrowserClient } from "@/lib/supabase";
import type { TablesUpdate } from "@/types/database";
import { rowToClientProgram, rowToSavedProgram, savedProgramToRow } from "../lib/serialize";
import type { ClientProgram, SavedProgram } from "../types";

export async function updateSavedProgram(
  program: SavedProgram,
): Promise<SyncResult<SavedProgram>> {
  const supabase = getBrowserClient();
  return persist(
    { name: "program:update-template", payload: { id: program.id } },
    async () => {
      const { data, error } = await supabase
        .from("saved_programs")
        .update(savedProgramToRow(program))
        .eq("id", program.id)
        .select()
        .single();
      if (error) throw error;
      return rowToSavedProgram(data);
    },
  );
}

export interface ClientProgramProgressUpdate {
  nextWorkoutIndex?: number;
  status?: ClientProgram["status"];
  /** ISO `YYYY-MM-DD` or null to clear. */
  endDate?: string | null;
}

export async function updateClientProgramProgress(
  id: string,
  update: ClientProgramProgressUpdate,
): Promise<SyncResult<ClientProgram>> {
  const supabase = getBrowserClient();
  const row: TablesUpdate<"client_programs"> = {};
  if (update.nextWorkoutIndex !== undefined)
    row.next_workout_index = update.nextWorkoutIndex;
  if (update.status !== undefined) row.status = update.status;
  if (update.endDate !== undefined) row.end_date = update.endDate;

  return persist(
    { name: "program:update-progress", payload: { id } },
    async () => {
      const { data, error } = await supabase
        .from("client_programs")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rowToClientProgram(data);
    },
  );
}

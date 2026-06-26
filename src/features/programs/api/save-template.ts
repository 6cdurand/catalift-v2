"use client";

// Save a trainer's program template to `saved_programs`. Routed through the
// data-sync `persist` chokepoint: awaited with retry + backoff, reported once to
// Sentry on terminal failure, and enqueued for offline replay. No fire-and-forget.

import { persist, type SyncResult } from "@/features/data-sync";
import { getBrowserClient } from "@/lib/supabase";
import { rowToSavedProgram, savedProgramToRow } from "../lib/serialize";
import type { SavedProgram } from "../types";

export async function saveProgramTemplate(
  program: SavedProgram,
): Promise<SyncResult<SavedProgram>> {
  const supabase = getBrowserClient();
  return persist(
    { name: "program:save-template", payload: { id: program.id } },
    async () => {
      const { data, error } = await supabase
        .from("saved_programs")
        .upsert(savedProgramToRow(program))
        .select()
        .single();
      if (error) throw error;
      return rowToSavedProgram(data);
    },
  );
}

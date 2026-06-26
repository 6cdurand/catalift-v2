"use client";

// Deletes routed through `persist` (await + retry, no fire-and-forget). RLS scopes
// the delete to the owning trainer; callers update local store state on success.

import { persist, type SyncResult } from "@/features/data-sync";
import { getBrowserClient } from "@/lib/supabase";

export async function deleteSavedProgram(
  id: string,
): Promise<SyncResult<void>> {
  const supabase = getBrowserClient();
  return persist(
    { name: "program:delete-template", payload: { id } },
    async () => {
      const { error } = await supabase
        .from("saved_programs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  );
}

export async function deleteClientProgram(
  id: string,
): Promise<SyncResult<void>> {
  const supabase = getBrowserClient();
  return persist(
    { name: "program:delete-client", payload: { id } },
    async () => {
      const { error } = await supabase
        .from("client_programs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  );
}

"use client";

// Assign a program to a client → a `client_programs` row. The program is
// sanitized first (sanitizeProgramForSave strips stray scheduledDay from flexible
// programs — the v1 BUG-010 trigger). Routed through `persist`: await + retry, no
// fire-and-forget.

import { persist, type SyncResult } from "@/features/data-sync";
import { getBrowserClient } from "@/lib/supabase";
import { sanitizeProgramForSave } from "../lib/get-next-workout";
import { clientProgramToRow, rowToClientProgram } from "../lib/serialize";
import type { ClientProgram } from "../types";

export async function assignProgramToClient(
  program: ClientProgram,
): Promise<SyncResult<ClientProgram>> {
  const supabase = getBrowserClient();
  const sanitized = sanitizeProgramForSave(program);
  return persist(
    {
      name: "program:assign",
      payload: { id: sanitized.id, clientId: sanitized.clientId },
    },
    async () => {
      const { data, error } = await supabase
        .from("client_programs")
        .upsert(clientProgramToRow(sanitized))
        .select()
        .single();
      if (error) throw error;
      return rowToClientProgram(data);
    },
  );
}

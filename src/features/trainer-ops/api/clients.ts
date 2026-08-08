"use client";

/**
 * clients.ts — trainer-client link mutations.
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:375-381`
 * (`handleDeleteClient`), which removes the client from the trainer's list and
 * explicitly does NOT delete the account: "Supabase account deletion should
 * only happen from the user's own Settings page".
 */

import { getBrowserClient } from "@/lib/supabase";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `[trainer-ops.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[trainer-ops.${operationName}] retry exhausted`);
}

/**
 * Remove a client from the signed-in trainer's roster.
 *
 * Deletes ONLY the `trainer_clients` link row. The client's account, workouts,
 * and money history all survive: `client_sessions` and `client_payments` FK to
 * `public.users(id)`, not to `trainer_clients`
 * (`00016_payments_sessions.sql:25-26,69-70`), so nothing cascades.
 *
 * Scoped by `trainer_id` in the query AND by the `tc_delete_trainer` RLS policy
 * (`using (trainer_id = auth.uid())`). The returning `select` is what makes a
 * silent RLS refusal observable — a delete that matches zero rows reports no
 * error, so without it a blocked delete would look like success (G-11: no
 * silent failures).
 */
export async function removeClient(clientId: string): Promise<void> {
  return withRetry(async () => {
    const supabase = getBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("trainer_clients")
      .delete()
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Client link not found — nothing was removed");
    }
  }, "removeClient");
}

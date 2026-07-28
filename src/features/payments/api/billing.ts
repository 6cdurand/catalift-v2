"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { ClientBilling, TrainerClientBilling } from "../types";

interface TrainerBillingRow {
  client_id: string;
  status: string;
  historical_offset_sessions: number | null;
  total_paid_offset: number | null;
  price_per_session: number | null;
  client: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export async function fetchClientBilling(
  clientId: string,
): Promise<ClientBilling> {
  const supabase = getBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("trainer_clients")
    .select("historical_offset_sessions, total_paid_offset, price_per_session")
    .eq("trainer_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;

  return {
    historicalOffsetSessions: data?.historical_offset_sessions ?? 0,
    totalPaidOffset: data?.total_paid_offset ?? 0,
    pricePerSession: data?.price_per_session ?? null,
  };
}

/**
 * Billing primitives for the trainer's WHOLE roster, in ONE query.
 *
 * Same columns `fetchClientBilling` reads (so the roster-wide tracker and the
 * per-client file can never disagree), plus the joined `users` identity —
 * mirroring the join style `trainer-ops/api/roster.ts` already uses. Scoped by
 * `trainer_id` in the query AND by the `client_payments_trainer_all` /
 * `trainer_clients` RLS policies.
 */
export async function fetchTrainerClientBilling(): Promise<
  TrainerClientBilling[]
> {
  const supabase = getBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("trainer_clients")
    .select(
      `
      client_id,
      status,
      historical_offset_sessions,
      total_paid_offset,
      price_per_session,
      client:users!trainer_clients_client_id_fkey(id, full_name, avatar_url)
    `,
    )
    .eq("trainer_id", user.id);
  if (error) throw error;

  return ((data ?? []) as unknown as TrainerBillingRow[]).map((row) => ({
    clientId: row.client_id,
    name: row.client?.full_name || "Unknown",
    avatarUrl: row.client?.avatar_url ?? null,
    status: row.status,
    historicalOffsetSessions: row.historical_offset_sessions ?? 0,
    totalPaidOffset: row.total_paid_offset ?? 0,
    pricePerSession: row.price_per_session ?? null,
  }));
}

"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { ClientBilling } from "../types";

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

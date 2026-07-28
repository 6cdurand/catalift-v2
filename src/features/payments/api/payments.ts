"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { ClientPayment, PaymentMethod } from "../types";
import { rowToClientPayment } from "../lib/serialize";

type PaymentInsert = Database["public"]["Tables"]["client_payments"]["Insert"];

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
          `[payments.${operationName}] failed after ${MAX_RETRIES} attempts:`,
          err,
        );
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }
  }
  throw new Error(`[payments.${operationName}] retry exhausted`);
}

export async function fetchClientPayments(
  clientId: string,
): Promise<ClientPayment[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("client_payments")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToClientPayment);
}

/**
 * Every `client_payments` row this trainer owns, newest first.
 *
 * Scoped by `trainer_id` in the query AND by the `client_payments_trainer_all`
 * RLS policy (`trainer_id = auth.uid()`). Ordering matches
 * `fetchClientPayments` (`created_at` desc) so a per-client slice of this
 * result is byte-identical to what the client file renders.
 */
export async function fetchTrainerPayments(): Promise<ClientPayment[]> {
  const supabase = getBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("client_payments")
    .select("*")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToClientPayment);
}

export interface LogPaymentParams {
  clientId: string;
  amount: number;
  sessionsIncluded?: number;
  method?: PaymentMethod;
  description?: string;
  paidAt?: string;
}

export async function logPayment(
  params: LogPaymentParams,
): Promise<ClientPayment> {
  const supabase = getBrowserClient();

  return withRetry(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const row: PaymentInsert = {
      trainer_id: user.id,
      client_id: params.clientId,
      amount: params.amount,
      sessions_included: params.sessionsIncluded ?? 1,
      method: params.method ?? null,
      status: "paid",
      description: params.description ?? null,
      paid_at: params.paidAt ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("client_payments")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;

    return rowToClientPayment(data);
  }, "logPayment");
}

export async function adjustPaidOffset(
  clientId: string,
  delta: number,
): Promise<void> {
  const supabase = getBrowserClient();

  await withRetry(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: current, error: fetchError } = await supabase
      .from("trainer_clients")
      .select("total_paid_offset")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .single();
    if (fetchError) throw fetchError;

    const newValue = (current.total_paid_offset ?? 0) + delta;

    const { error } = await supabase
      .from("trainer_clients")
      .update({ total_paid_offset: newValue })
      .eq("trainer_id", user.id)
      .eq("client_id", clientId);
    if (error) throw error;
  }, "adjustPaidOffset");
}

export async function updateClientRate(
  clientId: string,
  pricePerSession: number,
): Promise<void> {
  const supabase = getBrowserClient();

  await withRetry(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("trainer_clients")
      .update({ price_per_session: pricePerSession })
      .eq("trainer_id", user.id)
      .eq("client_id", clientId);
    if (error) throw error;
  }, "updateClientRate");
}

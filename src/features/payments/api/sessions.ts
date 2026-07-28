"use client";

import { getBrowserClient } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { ClientSession, SessionSource } from "../types";
import { rowToClientSession } from "../lib/serialize";

type SessionInsert = Database["public"]["Tables"]["client_sessions"]["Insert"];

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

export async function fetchClientSessions(
  clientId: string,
): Promise<ClientSession[]> {
  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("client_sessions")
    .select("*")
    .eq("client_id", clientId)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToClientSession);
}

export interface MarkSessionCompleteParams {
  clientId: string;
  source: SessionSource;
  workoutId?: string;
  calendarEventId?: string;
  sessionDate?: string;
  notes?: string;
}

export async function markSessionComplete(
  params: MarkSessionCompleteParams,
): Promise<ClientSession> {
  const supabase = getBrowserClient();

  return withRetry(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const row: SessionInsert = {
      trainer_id: user.id,
      client_id: params.clientId,
      source: params.source,
      workout_id: params.workoutId ?? null,
      calendar_event_id: params.calendarEventId ?? null,
      session_date: params.sessionDate,
      notes: params.notes ?? null,
    };

    const { data, error } = await supabase
      .from("client_sessions")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing, error: fetchError } = await supabase
          .from("client_sessions")
          .select("*")
          .eq("client_id", params.clientId)
          .eq(
            params.calendarEventId ? "calendar_event_id" : "workout_id",
            params.calendarEventId ?? params.workoutId,
          )
          .single();
        if (fetchError) throw fetchError;
        return rowToClientSession(existing);
      }
      throw error;
    }

    return rowToClientSession(data);
  }, "markSessionComplete");
}

export async function addManualSession(
  clientId: string,
): Promise<ClientSession> {
  return markSessionComplete({ clientId, source: "manual_plus_one" });
}

export async function adjustSessionOffset(
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
      .select("historical_offset_sessions")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .single();
    if (fetchError) throw fetchError;

    const newValue = (current.historical_offset_sessions ?? 0) + delta;

    const { error } = await supabase
      .from("trainer_clients")
      .update({ historical_offset_sessions: newValue })
      .eq("trainer_id", user.id)
      .eq("client_id", clientId);
    if (error) throw error;
  }, "adjustSessionOffset");
}

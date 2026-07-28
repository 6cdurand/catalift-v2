"use client";

// Roster-wide payments state for the trainer tracker (/payments) and the trainer
// profile earnings card. Fetches the three F2 primitives ONCE and hands them to
// the pure `buildTrainerPaymentRows` roll-up, so every figure it exposes is the
// same figure `useClientPayments` shows on the client file.

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchTrainerClientBilling } from "../api/billing";
import {
  adjustPaidOffset,
  fetchTrainerPayments,
  logPayment,
  updateClientRate,
  type LogPaymentParams,
} from "../api/payments";
import { adjustSessionOffset, fetchTrainerSessions } from "../api/sessions";
import {
  buildTrainerEarnings,
  buildTrainerPaymentRows,
  type TrainerEarnings,
  type TrainerPaymentRow,
  type TrainerPaymentTotals,
} from "../lib/aggregate";
import type {
  ClientPayment,
  ClientSession,
  TrainerClientBilling,
} from "../types";

export interface UseTrainerPaymentsResult {
  rows: TrainerPaymentRow[];
  totals: TrainerPaymentTotals;
  earnings: TrainerEarnings;
  /** Every payment this trainer owns, newest first (the History surface). */
  payments: ClientPayment[];
  isLoading: boolean;
  error: string | null;
  isMutating: boolean;
  reload: () => Promise<void>;
  logNewPayment: (
    clientId: string,
    params: Omit<LogPaymentParams, "clientId">,
  ) => Promise<void>;
  setRate: (clientId: string, pricePerSession: number) => Promise<void>;
  adjustPaid: (clientId: string, delta: number) => Promise<void>;
  adjustSessions: (clientId: string, delta: number) => Promise<void>;
}

export function useTrainerPayments(enabled = true): UseTrainerPaymentsResult {
  const [billing, setBilling] = useState<TrainerClientBilling[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // No range argument — the tracker and the profile totals are all-time.
    const [nextBilling, nextSessions, nextPayments] = await Promise.all([
      fetchTrainerClientBilling(),
      fetchTrainerSessions(),
      fetchTrainerPayments(),
    ]);
    setBilling(nextBilling);
    setSessions(nextSessions);
    setPayments(nextPayments);
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      throw err;
    }
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load payments",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  // Every write is awaited, then the roster is refetched so the summary cards,
  // the row and the history section all move together (no fire-and-forget).
  const runMutation = useCallback(
    async (fn: () => Promise<void>) => {
      setIsMutating(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [load],
  );

  const logNewPayment = useCallback(
    async (clientId: string, params: Omit<LogPaymentParams, "clientId">) => {
      await runMutation(async () => {
        await logPayment({ ...params, clientId });
      });
    },
    [runMutation],
  );

  const setRate = useCallback(
    async (clientId: string, pricePerSession: number) => {
      await runMutation(async () => {
        await updateClientRate(clientId, pricePerSession);
      });
    },
    [runMutation],
  );

  const adjustPaid = useCallback(
    async (clientId: string, delta: number) => {
      await runMutation(async () => {
        await adjustPaidOffset(clientId, delta);
      });
    },
    [runMutation],
  );

  const adjustSessions = useCallback(
    async (clientId: string, delta: number) => {
      await runMutation(async () => {
        await adjustSessionOffset(clientId, delta);
      });
    },
    [runMutation],
  );

  const { rows, totals } = useMemo(
    () => buildTrainerPaymentRows(billing, sessions, payments),
    [billing, sessions, payments],
  );

  const earnings = useMemo(() => buildTrainerEarnings(payments), [payments]);

  return {
    rows,
    totals,
    earnings,
    payments,
    isLoading,
    error,
    isMutating,
    reload,
    logNewPayment,
    setRate,
    adjustPaid,
    adjustSessions,
  };
}

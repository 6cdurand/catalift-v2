"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchClientBilling } from "../api/billing";
import {
  adjustPaidOffset,
  fetchClientPayments,
  logPayment,
  updateClientRate,
  type LogPaymentParams,
} from "../api/payments";
import { addManualSession, fetchClientSessions } from "../api/sessions";
import {
  getDisplayedPaidCount,
  getDisplayedSessionCount,
  getOutstanding,
} from "../lib/derive";
import type {
  ClientBilling,
  ClientPayment,
  ClientSession,
  OutstandingResult,
} from "../types";

export const DEFAULT_CURRENCY = "NZD";

const EMPTY_BILLING: ClientBilling = {
  historicalOffsetSessions: 0,
  totalPaidOffset: 0,
  pricePerSession: null,
};

export interface UseClientPaymentsResult {
  billing: ClientBilling;
  sessions: ClientSession[];
  payments: ClientPayment[];
  completedSessions: number;
  paidSessions: number;
  outstanding: OutstandingResult;
  currency: string;
  isLoading: boolean;
  error: string | null;
  isMutating: boolean;
  reload: () => Promise<void>;
  logNewPayment: (params: Omit<LogPaymentParams, "clientId">) => Promise<void>;
  setRate: (pricePerSession: number) => Promise<void>;
  addSession: () => Promise<void>;
  adjustPaid: (delta: number) => Promise<void>;
}

export function useClientPayments(clientId: string): UseClientPaymentsResult {
  const [billing, setBilling] = useState<ClientBilling>(EMPTY_BILLING);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextBilling, nextSessions, nextPayments] = await Promise.all([
      fetchClientBilling(clientId),
      fetchClientSessions(clientId),
      fetchClientPayments(clientId),
    ]);
    setBilling(nextBilling);
    setSessions(nextSessions);
    setPayments(nextPayments);
  }, [clientId]);

  const reload = useCallback(async () => {
    try {
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
      throw err;
    }
  }, [load]);

  useEffect(() => {
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
  }, [load]);

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
    async (params: Omit<LogPaymentParams, "clientId">) => {
      await runMutation(async () => {
        const created = await logPayment({ ...params, clientId });
        setPayments((prev) => [created, ...prev]);
      });
    },
    [clientId, runMutation],
  );

  const setRate = useCallback(
    async (pricePerSession: number) => {
      await runMutation(async () => {
        await updateClientRate(clientId, pricePerSession);
        setBilling((prev) => ({ ...prev, pricePerSession }));
      });
    },
    [clientId, runMutation],
  );

  const addSession = useCallback(async () => {
    await runMutation(async () => {
      const created = await addManualSession(clientId);
      setSessions((prev) =>
        prev.some((s) => s.id === created.id) ? prev : [created, ...prev],
      );
    });
  }, [clientId, runMutation]);

  const adjustPaid = useCallback(
    async (delta: number) => {
      await runMutation(async () => {
        await adjustPaidOffset(clientId, delta);
        setBilling((prev) => ({
          ...prev,
          totalPaidOffset: Math.max(0, prev.totalPaidOffset + delta),
        }));
      });
    },
    [clientId, runMutation],
  );

  const completedSessions = useMemo(
    () => getDisplayedSessionCount(billing.historicalOffsetSessions, sessions),
    [billing.historicalOffsetSessions, sessions],
  );

  const paidSessions = useMemo(
    () => getDisplayedPaidCount(billing.totalPaidOffset, payments),
    [billing.totalPaidOffset, payments],
  );

  const outstanding = useMemo(
    () =>
      getOutstanding(
        completedSessions,
        paidSessions,
        billing.pricePerSession ?? undefined,
      ),
    [completedSessions, paidSessions, billing.pricePerSession],
  );

  const currency = payments[0]?.currency ?? DEFAULT_CURRENCY;

  return {
    billing,
    sessions,
    payments,
    completedSessions,
    paidSessions,
    outstanding,
    currency,
    isLoading,
    error,
    isMutating,
    reload,
    logNewPayment,
    setRate,
    addSession,
    adjustPaid,
  };
}

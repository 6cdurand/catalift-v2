"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useClientPayments } from "../hooks/useClientPayments";
import { formatMoney } from "../lib/format";
import { LogPaymentDialog } from "./LogPaymentDialog";
import { PaymentHistoryList } from "./PaymentHistoryList";
import { RateAndAdjustRow } from "./RateAndAdjustRow";

function Stat({
  label,
  value,
  testId,
  emphasis,
}: {
  label: string;
  value: string;
  testId: string;
  emphasis?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        data-testid={testId}
        className={
          emphasis
            ? "text-xl font-semibold text-amber-600"
            : "text-xl font-semibold text-gray-900"
        }
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}

export function ClientPaymentsSection({ clientId }: { clientId: string }) {
  const {
    billing,
    payments,
    completedSessions,
    paidSessions,
    outstanding,
    currency,
    isLoading,
    error,
    isMutating,
    logNewPayment,
    setRate,
    addSession,
    adjustPaid,
  } = useClientPayments(clientId);

  const [isLogOpen, setIsLogOpen] = useState(false);

  return (
    <div data-testid="client-payments-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Payments
        </h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={isLoading}
          onClick={() => setIsLogOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Log Payment
        </Button>
      </div>

      {isLoading ? (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-gray-500">Loading payments…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat
                  label="Sessions done"
                  value={String(completedSessions)}
                  testId="stat-completed"
                />
                <Stat
                  label="Paid (sessions)"
                  value={String(paidSessions)}
                  testId="stat-paid"
                />
                <Stat
                  label="Outstanding"
                  value={
                    outstanding.outstandingAmount != null
                      ? formatMoney(outstanding.outstandingAmount, currency)
                      : String(outstanding.outstandingSessions)
                  }
                  testId="stat-outstanding"
                  emphasis={outstanding.hasOutstanding}
                />
              </div>
            </CardContent>
          </Card>

          {outstanding.hasOutstanding && (
            <div
              role="alert"
              data-testid="outstanding-warning"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-500/10 px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                {outstanding.outstandingSessions} session
                {outstanding.outstandingSessions === 1 ? "" : "s"} outstanding
                {outstanding.outstandingAmount != null
                  ? ` · ${formatMoney(outstanding.outstandingAmount, currency)} owed`
                  : ""}
              </p>
            </div>
          )}

          <RateAndAdjustRow
            pricePerSession={billing.pricePerSession}
            currency={currency}
            disabled={isMutating}
            onSaveRate={setRate}
            onAddSession={addSession}
            onAdjustPaid={adjustPaid}
          />

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-2">Payment history</p>
            <PaymentHistoryList payments={payments} />
          </div>
        </div>
      )}

      <LogPaymentDialog
        open={isLogOpen}
        onOpenChange={setIsLogOpen}
        defaultAmount={billing.pricePerSession}
        defaultSessions={1}
        currency={currency}
        onSubmit={logNewPayment}
      />
    </div>
  );
}

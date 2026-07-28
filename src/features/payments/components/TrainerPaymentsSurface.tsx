"use client";

// All-clients payment tracker — "who owes me what" across the whole roster.
// Look ported from v1 `app/payments/page.tsx` (summary cards :538-563, search
// :579-600, client rows :601-720, outstanding action :850-880, history :890-960).
//
// Deliberately NOT ported: the master auto-count toggle (:462-537), the
// per-client auto-count tristate (:705-817), packages / package settings
// (:818-849, :960-1155) and every paymentDue / billing-cycle concept.

import { useMemo, useState } from "react";
import { Clock, DollarSign, Search, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";

import { useTrainerPayments } from "../hooks/useTrainerPayments";
import type { TrainerPaymentRow as PaymentRow } from "../lib/aggregate";
import { formatMethod, formatMoney, formatPaymentDate } from "../lib/format";
import { LogPaymentDialog } from "./LogPaymentDialog";
import { TrainerPaymentRow } from "./TrainerPaymentRow";

function SummaryCard({
  label,
  value,
  caption,
  valueClassName,
  testId,
}: {
  label: string;
  value: string;
  caption: string;
  valueClassName: string;
  testId: string;
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="p-3 text-center">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p data-testid={testId} className={`text-xl font-bold ${valueClassName}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

export interface TrainerPaymentsSurfaceProps {
  /** Navigate to the client file — the tracker never routes by itself. */
  onOpenClient: (clientId: string) => void;
}

export function TrainerPaymentsSurface({
  onOpenClient,
}: TrainerPaymentsSurfaceProps) {
  const {
    rows,
    totals,
    payments,
    isLoading,
    error,
    isMutating,
    reload,
    logNewPayment,
    setRate,
    adjustPaid,
    adjustSessions,
  } = useTrainerPayments();

  const [activeTab, setActiveTab] = useState("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [logTarget, setLogTarget] = useState<PaymentRow | null>(null);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(query));
  }, [rows, searchQuery]);

  const nameById = useMemo(
    () => new Map(rows.map((r) => [r.clientId, r] as const)),
    [rows],
  );

  if (isLoading) {
    return <LoadingState label="Loading payments" />;
  }

  if (error && rows.length === 0) {
    return (
      <ErrorState
        title="Could not load payments"
        description={error}
        onRetry={() => void reload()}
      />
    );
  }

  return (
    <div data-testid="trainer-payments-surface">
      {/* Summary Cards — v1 :538-563 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryCard
          label="Outstanding"
          value={formatMoney(totals.outstandingAmount, totals.currency)}
          caption={`${totals.clientsWithOutstanding} ${
            totals.clientsWithOutstanding === 1 ? "client" : "clients"
          }`}
          valueClassName={
            totals.outstandingAmount > 0 ? "text-amber-500" : "text-sky-500"
          }
          testId="summary-outstanding"
        />
        <SummaryCard
          label="Total paid"
          value={formatMoney(totals.totalPaid, totals.currency)}
          caption="all time"
          valueClassName="text-emerald-500"
          testId="summary-total-paid"
        />
        <SummaryCard
          label="Sessions"
          value={String(totals.completedSessions)}
          caption="completed"
          valueClassName="text-gray-900"
          testId="summary-sessions"
        />
      </div>

      {totals.excludedCurrencies.length > 0 && (
        <p
          data-testid="mixed-currency-note"
          className="text-[10px] text-gray-400 mb-3"
        >
          Totals shown in {totals.currency}. Payments in{" "}
          {totals.excludedCurrencies.join(", ")} are excluded.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 mb-3">
          {error}
        </p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 mb-4">
          <TabsTrigger value="clients">
            <Users className="w-4 h-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          {/* Search Bar — v1 :579-600 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search clients..."
              aria-label="Search clients"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState
              data-testid="payments-clients-empty"
              icon={<Users />}
              title={searchQuery ? "No matching clients" : "No clients yet"}
              description={
                searchQuery
                  ? "Try a different name."
                  : "Add a client to start tracking payments."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <TrainerPaymentRow
                  key={row.clientId}
                  row={row}
                  disabled={isMutating}
                  onOpenClient={onOpenClient}
                  onLogPayment={setLogTarget}
                  onSaveRate={setRate}
                  onAdjustSessions={adjustSessions}
                  onAdjustPaid={adjustPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Payment history across all clients — v1 :890-960 */}
        <TabsContent value="history">
          {payments.length === 0 ? (
            <EmptyState
              data-testid="payments-history-empty"
              icon={<DollarSign />}
              title="No payment history yet"
              description="Logged payments appear here, newest first."
            />
          ) : (
            <div className="space-y-2" data-testid="payments-history-list">
              {payments.map((payment) => {
                const client = nameById.get(payment.clientId);
                const name = client?.name ?? "Unknown";
                return (
                  <Card
                    key={payment.id}
                    data-testid="payments-history-item"
                    className="bg-white border-gray-200 shadow-sm"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={client?.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-gray-100 text-gray-900 text-xs">
                              {name[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              className="font-medium text-gray-900 text-sm hover:text-rose-500 transition-colors text-left truncate"
                              onClick={() => onOpenClient(payment.clientId)}
                            >
                              {name}
                            </button>
                            <p className="text-xs text-gray-500">
                              {formatPaymentDate(
                                payment.paidAt ?? payment.createdAt,
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-500">
                            {formatMoney(payment.amount, payment.currency)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.sessionsIncluded} session
                            {payment.sessionsIncluded === 1 ? "" : "s"} ·{" "}
                            {formatMethod(payment.method)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LogPaymentDialog
        open={logTarget !== null}
        onOpenChange={(open) => {
          if (!open) setLogTarget(null);
        }}
        defaultAmount={
          logTarget?.outstandingAmount ?? logTarget?.pricePerSession ?? null
        }
        defaultSessions={Math.max(1, logTarget?.outstandingSessions ?? 1)}
        currency={logTarget?.currency ?? totals.currency}
        onSubmit={async (values) => {
          if (!logTarget) return;
          await logNewPayment(logTarget.clientId, values);
        }}
      />
    </div>
  );
}

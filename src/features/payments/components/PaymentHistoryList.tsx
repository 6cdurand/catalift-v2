"use client";

import { Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { formatMethod, formatMoney, formatPaymentDate } from "../lib/format";
import type { ClientPayment } from "../types";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "outline"
> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  refunded: "outline",
};

export function PaymentHistoryList({ payments }: { payments: ClientPayment[] }) {
  if (payments.length === 0) {
    return (
      <Card
        className="bg-white border-gray-200 shadow-sm"
        data-testid="payment-history-empty"
      >
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No payments logged yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Use Log Payment to record one
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2" data-testid="payment-history-list">
      {payments.map((payment) => (
        <div
          key={payment.id}
          data-testid="payment-history-item"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {formatMoney(payment.amount, payment.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatPaymentDate(payment.paidAt ?? payment.createdAt)} ·{" "}
                {payment.sessionsIncluded} session
                {payment.sessionsIncluded === 1 ? "" : "s"} ·{" "}
                {formatMethod(payment.method)}
              </p>
              {payment.description && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {payment.description}
                </p>
              )}
            </div>
            <Badge
              variant={STATUS_VARIANT[payment.status] ?? "outline"}
              className="capitalize shrink-0"
            >
              {payment.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

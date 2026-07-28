"use client";

// One client row on the all-clients payment tracker. Look ported from v1
// `app/payments/page.tsx:601-720` + `:850-880`.
//
// Deliberately NOT ported (clean model, DECISIONS.md 2026-07-28): the auto-count
// tristate, packages / package settings, and any paymentDue / billing-cycle
// concept. `hasOutstanding` is the ONE warning.

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  DollarSign,
  Minus,
  Pencil,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { formatMoney } from "../lib/format";
import type { TrainerPaymentRow as PaymentRow } from "../lib/aggregate";

export interface TrainerPaymentRowProps {
  row: PaymentRow;
  disabled: boolean;
  onOpenClient: (clientId: string) => void;
  onLogPayment: (row: PaymentRow) => void;
  onSaveRate: (clientId: string, pricePerSession: number) => Promise<void>;
  onAdjustSessions: (clientId: string, delta: number) => Promise<void>;
  onAdjustPaid: (clientId: string, delta: number) => Promise<void>;
}

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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        data-testid={testId}
        className={
          emphasis ? "font-bold text-amber-600" : "font-bold text-gray-900"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function TrainerPaymentRow({
  row,
  disabled,
  onOpenClient,
  onLogPayment,
  onSaveRate,
  onAdjustSessions,
  onAdjustPaid,
}: TrainerPaymentRowProps) {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);

  function startRateEdit() {
    setRateDraft(row.pricePerSession != null ? String(row.pricePerSession) : "");
    setRateError(null);
    setIsEditingRate(true);
  }

  async function saveRate() {
    const parsed = Number(rateDraft);
    if (rateDraft.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setRateError("Rate must be 0 or more");
      return;
    }
    setRateError(null);
    try {
      await onSaveRate(row.clientId, parsed);
      setIsEditingRate(false);
    } catch {
      setRateError("Could not save rate");
    }
  }

  return (
    <Card
      data-testid="payment-client-row"
      data-client-id={row.clientId}
      data-outstanding={row.hasOutstanding ? "true" : "false"}
      className={`bg-white border-gray-200 shadow-sm ${
        row.hasOutstanding ? "border-l-4 border-l-amber-500" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-10 h-10">
              <AvatarImage src={row.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-900">
                {row.name[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  className="font-medium text-gray-900 hover:text-rose-500 transition-colors text-left truncate"
                  onClick={() => onOpenClient(row.clientId)}
                >
                  {row.name}
                </button>
                {row.status !== "active" && (
                  <Badge variant="outline" className="capitalize">
                    {row.status}
                  </Badge>
                )}
              </div>

              {isEditingRate ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    autoFocus
                    aria-label={`Per-session rate for ${row.name}`}
                    value={rateDraft}
                    onChange={(e) => setRateDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRate();
                      if (e.key === "Escape") setIsEditingRate(false);
                    }}
                    className="h-8 w-20 text-sm"
                  />
                  <button
                    aria-label={`Save rate for ${row.name}`}
                    disabled={disabled}
                    onClick={() => void saveRate()}
                    className="text-rose-500 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    aria-label="Cancel rate edit"
                    onClick={() => setIsEditingRate(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p data-testid="row-rate" className="text-xs text-gray-500">
                    {row.pricePerSession != null
                      ? `${formatMoney(row.pricePerSession, row.currency)}/session`
                      : "No rate set"}
                  </p>
                  <button
                    aria-label={`Edit rate for ${row.name}`}
                    onClick={startRateEdit}
                    className="text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-gray-400"
                  aria-label={`Adjust counts for ${row.name}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-64 bg-white border-gray-200"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Manual corrections
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-700">Completed</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Decrease completed count for ${row.name}`}
                      onClick={() => void onAdjustSessions(row.clientId, -1)}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Increase completed count for ${row.name}`}
                      onClick={() => void onAdjustSessions(row.clientId, 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Paid</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Decrease paid count for ${row.name}`}
                      onClick={() => void onAdjustPaid(row.clientId, -1)}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Increase paid count for ${row.name}`}
                      onClick={() => void onAdjustPaid(row.clientId, 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 mt-3">
                  Corrections only. Logged payments and completed workouts
                  already count automatically.
                </p>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-gray-400 hover:text-emerald-500 gap-1 px-2"
              aria-label={`Log payment for ${row.name}`}
              onClick={() => onLogPayment(row)}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Log Payment</span>
            </Button>
          </div>
        </div>

        {/* Sessions / Paid / Outstanding — Outstanding is derived, never editable */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <Stat
            label="Sessions"
            value={String(row.completedSessions)}
            testId="row-completed"
          />
          <Stat
            label="Paid"
            value={String(row.paidSessions)}
            testId="row-paid"
          />
          <Stat
            label="Outstanding"
            value={
              row.outstandingAmount != null
                ? formatMoney(row.outstandingAmount, row.currency)
                : String(row.outstandingSessions)
            }
            testId="row-outstanding"
            emphasis={row.hasOutstanding}
          />
        </div>

        {rateError && (
          <p role="alert" className="text-xs text-red-600 mb-2">
            {rateError}
          </p>
        )}

        {row.hasOutstanding ? (
          <div
            data-testid="row-outstanding-alert"
            className="flex items-center justify-between gap-2 bg-amber-500/10 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-700">
                {row.outstandingAmount != null
                  ? `${formatMoney(row.outstandingAmount, row.currency)} · `
                  : ""}
                {row.outstandingSessions} session
                {row.outstandingSessions === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0"
              aria-label={`Log outstanding payment for ${row.name}`}
              onClick={() => onLogPayment(row)}
            >
              <Check className="w-4 h-4" />
              Log payment
            </Button>
          </div>
        ) : (
          row.completedSessions > 0 && (
            <div className="flex items-center justify-center gap-2 bg-sky-500/10 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              <span className="text-sm text-sky-600">
                All payments up to date
              </span>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

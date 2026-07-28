"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { PaymentMethod } from "../types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank" },
  { value: "other", label: "Other" },
];

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface LogPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount: number | null;
  defaultSessions: number;
  currency: string;
  onSubmit: (values: {
    amount: number;
    sessionsIncluded: number;
    method: PaymentMethod;
    description?: string;
    paidAt: string;
  }) => Promise<void>;
}

export function LogPaymentDialog({
  open,
  onOpenChange,
  defaultAmount,
  defaultSessions,
  currency,
  onSubmit,
}: LogPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Log Payment</DialogTitle>
          <DialogDescription>
            Record a payment against this client&apos;s sessions.
          </DialogDescription>
        </DialogHeader>

        <LogPaymentForm
          defaultAmount={defaultAmount}
          defaultSessions={defaultSessions}
          currency={currency}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rendered only while the dialog is open (Radix unmounts closed content), so
 * field state is initialised fresh on every open without a reset effect.
 */
function LogPaymentForm({
  defaultAmount,
  defaultSessions,
  currency,
  onSubmit,
  onClose,
}: Omit<LogPaymentDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(
    defaultAmount != null ? String(defaultAmount) : "",
  );
  const [sessions, setSessions] = useState(
    String(Math.max(1, defaultSessions)),
  );
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [description, setDescription] = useState("");
  const [paidAt, setPaidAt] = useState(todayISODate());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    const parsedAmount = Number(amount);
    const parsedSessions = Number(sessions);

    if (amount.trim() === "" || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setValidationError("Amount must be 0 or more");
      return;
    }
    if (
      sessions.trim() === "" ||
      !Number.isInteger(parsedSessions) ||
      parsedSessions < 0
    ) {
      setValidationError("Sessions included must be a whole number, 0 or more");
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    setIsSaving(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        sessionsIncluded: parsedSessions,
        method,
        description: description.trim() || undefined,
        paidAt: new Date(`${paidAt}T00:00:00`).toISOString(),
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not save payment",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="payment-amount" className="text-gray-700">
            Amount ({currency})
          </Label>
          <Input
            id="payment-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-sessions" className="text-gray-700">
            Sessions included
          </Label>
          <Input
            id="payment-sessions"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-gray-700">Method</Label>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={method === m.value}
                onClick={() => setMethod(m.value)}
                className={
                  method === m.value
                    ? "rounded-full border border-rose-200 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600"
                    : "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-date" className="text-gray-700">
            Date
          </Label>
          <Input
            id="payment-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-description" className="text-gray-700">
            Note (optional)
          </Label>
          <Input
            id="payment-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 10-session block"
          />
        </div>

        {(validationError || submitError) && (
          <p role="alert" className="text-xs text-red-600">
            {validationError ?? submitError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save payment"}
        </Button>
      </DialogFooter>
    </>
  );
}

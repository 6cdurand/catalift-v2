"use client";

import { useState } from "react";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface RateAndAdjustRowProps {
  pricePerSession: number | null;
  currency: string;
  disabled: boolean;
  onSaveRate: (pricePerSession: number) => Promise<void>;
  onAddSession: () => Promise<void>;
  onAdjustPaid: (delta: number) => Promise<void>;
}

export function RateAndAdjustRow({
  pricePerSession,
  currency,
  disabled,
  onSaveRate,
  onAddSession,
  onAdjustPaid,
}: RateAndAdjustRowProps) {
  const [rate, setRate] = useState(
    pricePerSession != null ? String(pricePerSession) : "",
  );
  const [rateError, setRateError] = useState<string | null>(null);

  const parsed = Number(rate);
  const isDirty = rate.trim() !== "" && parsed !== (pricePerSession ?? NaN);

  async function handleSaveRate() {
    if (rate.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setRateError("Rate must be 0 or more");
      return;
    }
    setRateError(null);
    try {
      await onSaveRate(parsed);
    } catch {
      setRateError("Could not save rate");
    }
  }

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      data-testid="rate-and-adjust-row"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="price-per-session"
            className="block text-xs text-gray-400 mb-1"
          >
            Per-session rate ({currency})
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="price-per-session"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={rate}
              disabled={disabled}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Not set"
              className="h-9 max-w-32 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={disabled || !isDirty}
              onClick={handleSaveRate}
            >
              Save
            </Button>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="Adjust counts">
              <SlidersHorizontal className="w-4 h-4" />
              Adjust
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 bg-white border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Manual corrections
            </p>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-700">Completed</span>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                aria-label="Add one completed session"
                onClick={() => void onAddSession()}
              >
                <Plus className="w-3.5 h-3.5" />1 session
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Paid</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={disabled}
                  aria-label="Decrease paid count"
                  onClick={() => void onAdjustPaid(-1)}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={disabled}
                  aria-label="Increase paid count"
                  onClick={() => void onAdjustPaid(1)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-3">
              Corrections only. Logged payments and completed workouts already
              count automatically.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {rateError && (
        <p role="alert" className="text-xs text-red-600 mt-2">
          {rateError}
        </p>
      )}
    </div>
  );
}

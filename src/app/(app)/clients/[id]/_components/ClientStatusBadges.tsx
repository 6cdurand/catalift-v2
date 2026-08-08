"use client";

/**
 * Header status badges — inventory rows 5 + 6.
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:651-669`
 * ("Pending Signup" amber badge at `:652-656`, status badge at `:657-669`).
 * v1's status badge is clickable and writes `trainer_clients.status`; this one is
 * deliberately read-only — see `_lib/client-status.ts` for why (blocker B16).
 */

import { Badge } from "@/components/ui/badge";
import { isPendingSignup, statusLabel } from "../_lib/client-status";

export function ClientStatusBadges({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1">
      {isPendingSignup(status) && (
        <Badge
          variant="secondary"
          data-testid="badge-pending-signup"
          className="bg-amber-500/20 text-amber-200 border-amber-400/30 text-[10px]"
        >
          Pending Signup
        </Badge>
      )}
      <Badge
        data-testid="badge-client-status"
        variant={status === "active" ? "default" : "secondary"}
        className={
          status === "active"
            ? "bg-white/20 text-white border-white/30"
            : "bg-rose-800 text-rose-200"
        }
      >
        {statusLabel(status)}
      </Badge>
    </div>
  );
}

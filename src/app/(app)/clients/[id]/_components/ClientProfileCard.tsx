"use client";

/**
 * Client profile card popup — inventory row 57 (PARTIAL).
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:3352-3412`,
 * opened by the header avatar (v1 `:632-637`).
 *
 * v1 shows avatar · name · @username · gym · Workouts/Medals/PBs tiles ·
 * strength rating · bio. v2 can render avatar, name, @username, Workouts and
 * PBs today. Deliberately NOT rendered:
 *  - **gym / bio** — `public.users` has no `gym_name` or `bio` column.
 *  - **Medals / Strength Rating** — `FEATURE_FLAGS.medals` and
 *    `FEATURE_FLAGS.strengthRating` are `false` and neither module exists in v2
 *    yet. They are flag-gated AND data-gated below, so they light up when the
 *    module lands and a count is passed — never as an empty tile.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isFeatureEnabled } from "@/config/feature-flags";

interface ClientProfileCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  /** Rows in `public.workouts` for this client. A WORKOUT count, never a session count. */
  workoutCount: number;
  /** Rows in `public.personal_bests`. `null` when the read failed or is pending. */
  pbCount: number | null;
  /** Reserved for the deferred medals module — gated on `FEATURE_FLAGS.medals`. */
  medalCount?: number | null;
  /** Reserved for the deferred strength-rating module — gated on `FEATURE_FLAGS.strengthRating`. */
  strengthRating?: number | null;
}

function Tile({
  value,
  label,
  valueClassName,
}: {
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
      <p className={valueClassName ?? "text-2xl font-bold text-gray-900"}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function ClientProfileCard({
  open,
  onOpenChange,
  name,
  username,
  avatarUrl,
  workoutCount,
  pbCount,
  medalCount = null,
  strengthRating = null,
}: ClientProfileCardProps) {
  const showMedals = isFeatureEnabled("medals") && medalCount != null;
  const showStrength = isFeatureEnabled("strengthRating") && strengthRating != null;

  const tiles = [
    <Tile key="workouts" value={String(workoutCount)} label="Workouts" />,
    ...(showMedals
      ? [
          <Tile
            key="medals"
            value={String(medalCount)}
            label="Medals"
            valueClassName="text-2xl font-bold text-amber-500"
          />,
        ]
      : []),
    ...(pbCount != null
      ? [
          <Tile
            key="pbs"
            value={String(pbCount)}
            label="PBs"
            valueClassName="text-2xl font-bold text-sky-500"
          />,
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-white border-gray-200 shadow-sm max-w-sm"
        data-testid="client-profile-card"
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-16 h-16 border-2 border-rose-500">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-900 text-xl">
                {name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <DialogTitle className="text-gray-900">{name}</DialogTitle>
              {username && (
                <p className="text-sm text-gray-500" data-testid="profile-card-username">
                  @{username}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div
          className={
            tiles.length === 3
              ? "grid grid-cols-3 gap-3 mt-3"
              : tiles.length === 2
                ? "grid grid-cols-2 gap-3 mt-3"
                : "grid grid-cols-1 gap-3 mt-3"
          }
        >
          {tiles}
        </div>

        {showStrength && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Strength Rating</span>
              <span className="text-lg font-bold text-gray-900">
                {strengthRating.toFixed(0)}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

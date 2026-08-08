"use client";

/**
 * Fixed bottom quick-action bar — inventory rows 47 (Message) and 49 (Book).
 *
 * Ported from `v1: src/app/clients/[id]/page.tsx:2907-2951`.
 * v1's Message button switches to the in-page Messages tab (it stays on the
 * client file) — that is a different control from the header's Message button,
 * which navigates to `/messages`. v1 has both; so does this.
 *
 * v1's middle button, "Start Workout" (`:2917-2941`), is NOT ported. It inserts a
 * `workouts` row attributed to the client, and `workouts_insert_own` is
 * `with check (user_id = auth.uid())` (`00003_workout_core.sql:33`), so in v2 a
 * trainer cannot write a workout on a client's behalf. The only thing that would
 * ship is a button logging the session into the TRAINER's own history — the v1
 * contamination bug. See inventory row 48 / blocker B17.
 *
 * Layout: `MainLayout` already owns `fixed bottom-0` (nav, `MainLayout.tsx:60`)
 * and `fixed bottom-[72px]` (active-workout banner, `:44`). v1 uses `bottom-20`,
 * which clears the nav but would sit on top of the banner, so the bar lifts to
 * `bottom-[136px]` while a workout is in progress.
 */

import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle } from "lucide-react";

export function ClientQuickActions({
  hasActiveWorkoutBanner,
  onMessage,
  onBook,
}: {
  hasActiveWorkoutBanner: boolean;
  onMessage: () => void;
  onBook: () => void;
}) {
  return (
    <div
      data-testid="client-quick-actions"
      className={`fixed left-0 right-0 px-4 z-40 ${
        hasActiveWorkoutBanner ? "bottom-[136px]" : "bottom-20"
      }`}
    >
      <div className="max-w-lg mx-auto flex gap-2">
        <Button
          className="flex-1 bg-sky-500 hover:bg-sky-600"
          onClick={onMessage}
          data-testid="quick-action-message"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Message
        </Button>
        <Button
          variant="outline"
          className="flex-1 bg-white"
          onClick={onBook}
          data-testid="quick-action-book"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book
        </Button>
      </div>
    </div>
  );
}

"use client";

// Trainer Today — the selected day's client schedule.
//
// Ports the v1 look from the v1 today page (`src/app/today/page.tsx:1686-1950`):
// section header + count badge, scroll container, per-row Card with a left
// colour accent bar, avatar → client-name button, and a completed state.
//
// PHASE 1: rows are PROGRAM-DERIVED and therefore UNTIMED — v1's times came
// from `calendar_events`, which v2 deliberately dropped. The sub-line shows the
// program-day label + program name instead. Times and a Book button arrive with
// the booking lane (Phase 2).
//
// Presentational only: data arrives via props, actions go out via callbacks.

import {
  CalendarRange,
  CheckCircle2,
  Dumbbell,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ScheduledSessionStatus } from "@/features/calendar";
import type { TrainerDaySession } from "@/features/trainer-ops/hooks/useTrainerWeekSchedule";
import {
  formatMonthDay,
  formatWeekdayLong,
} from "@/lib/week";

const STATUS_BADGE: Record<
  ScheduledSessionStatus,
  { label: string; className: string }
> = {
  upcoming: { label: "Upcoming", className: "bg-sky-500/10 text-sky-600" },
  done: { label: "Done", className: "bg-green-500/15 text-green-600" },
  missed: { label: "Missed", className: "bg-amber-500/15 text-amber-600" },
  rest: { label: "Rest", className: "bg-gray-500/10 text-gray-500" },
};

export interface TrainerDayScheduleProps {
  sessions: TrainerDaySession[];
  /** ISO YYYY-MM-DD currently selected. */
  selectedDate: string;
  /** ISO YYYY-MM-DD device-local today. */
  today: string;
  /** False when the trainer has no clients at all (drives the empty state). */
  hasClients: boolean;
  isLoading: boolean;
  error: Error | null;
  /** completedKeys with an in-flight mark-complete write. */
  markingKeys: Set<string>;
  onMarkComplete: (session: TrainerDaySession) => void;
  onOpenClient: (clientId: string) => void;
  onAddClient: () => void;
}

export function TrainerDaySchedule({
  sessions,
  selectedDate,
  today,
  hasClients,
  isLoading,
  error,
  markingKeys,
  onMarkComplete,
  onOpenClient,
  onAddClient,
}: TrainerDayScheduleProps) {
  const isToday = selectedDate === today;
  const heading = isToday
    ? "Today's Schedule"
    : `Schedule — ${formatMonthDay(selectedDate)}`;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
          <Users className="w-4 h-4" />
          {heading}
        </h2>
        <Badge
          variant="secondary"
          className="bg-sky-500/10 text-sky-500 text-xs border-transparent"
        >
          {sessions.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="schedule-skeleton">
          <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : error ? (
        <Card className="bg-white border-red-200">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-red-500">
              Could not load the schedule: {error.message}
            </p>
          </CardContent>
        </Card>
      ) : sessions.length > 0 ? (
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
          {sessions.map((row) => (
            <SessionRow
              key={row.completedKey}
              row={row}
              isMarking={markingKeys.has(row.completedKey)}
              onMarkComplete={onMarkComplete}
              onOpenClient={onOpenClient}
            />
          ))}
        </div>
      ) : hasClients ? (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-8 text-center">
            <CalendarRange className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Nothing scheduled for{" "}
              {isToday ? "today" : formatWeekdayLong(selectedDate)}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-8 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No clients yet. Add your first client to build a schedule.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-rose-500 hover:bg-rose-600"
              onClick={onAddClient}
            >
              <Users className="w-4 h-4 mr-1" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

interface SessionRowProps {
  row: TrainerDaySession;
  isMarking: boolean;
  onMarkComplete: (session: TrainerDaySession) => void;
  onOpenClient: (clientId: string) => void;
}

function SessionRow({
  row,
  isMarking,
  onMarkComplete,
  onOpenClient,
}: SessionRowProps) {
  const { clientName, avatarUrl, session, programName, isMarkedComplete } = row;
  const status = STATUS_BADGE[session.status];
  const subLine = programName
    ? `${session.label} · ${programName}`
    : session.label;

  return (
    <Card
      className={`bg-white shadow-sm overflow-hidden py-0 gap-0 transition-all ${
        isMarkedComplete ? "border-green-200" : "border-gray-200"
      }`}
      data-testid="trainer-session-row"
    >
      <div className="flex">
        {/* Left colour accent bar (v1 parity). */}
        <div className="w-1 bg-sky-500 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-sky-100 text-sky-600 text-sm">
                    {clientName?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenClient(row.clientId)}
                    className="font-medium text-gray-900 text-sm hover:text-sky-500 hover:underline transition-colors text-left truncate block max-w-full"
                  >
                    {clientName}
                  </button>
                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                    <Dumbbell className="w-3 h-3 shrink-0" />
                    <span className="truncate">{subLine}</span>
                  </p>
                </div>
              </div>

              {isMarkedComplete ? (
                <Badge className="bg-green-500/20 text-green-600 text-xs border-transparent shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              ) : (
                <Badge
                  className={`${status.className} text-xs border-transparent shrink-0`}
                >
                  {status.label}
                </Badge>
              )}
            </div>

            {!isMarkedComplete && (
              <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isMarking}
                  className="h-7 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                  onClick={() => onMarkComplete(row)}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {isMarking ? "Marking…" : "Mark complete"}
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

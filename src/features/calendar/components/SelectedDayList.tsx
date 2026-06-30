"use client";

import { useMemo } from "react";
import { Dumbbell, Users, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSessionsForDate } from "../lib/selectors";
import type { ScheduledSession, ScheduledSessionKind, ScheduledSessionStatus } from "../types";

export interface SelectedDayListProps {
  sessions: ScheduledSession[];
  selectedDate: string | null;
  today: string;
}

const STATUS_BADGE: Record<ScheduledSessionStatus, { variant: "success" | "default" | "destructive" | "secondary"; label: string }> = {
  done: { variant: "success", label: "Done" },
  upcoming: { variant: "default", label: "Upcoming" },
  missed: { variant: "destructive", label: "Missed" },
  rest: { variant: "secondary", label: "Rest" },
};

const KIND_ICON: Record<ScheduledSessionKind, typeof Dumbbell> = {
  "program-day": Dumbbell,
  "group-event": Users,
  "booking": Clock,
  "ad-hoc": Clock,
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SessionCard({ session }: { session: ScheduledSession }) {
  const Icon = KIND_ICON[session.kind] ?? Dumbbell;
  const badge = STATUS_BADGE[session.status];

  return (
    <Card className="border-gray-200 bg-white shadow-sm hover:border-gray-300">
      <CardContent className="flex items-start gap-3 py-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            session.status === "done" && "bg-emerald-100 text-emerald-600",
            session.status === "upcoming" && "bg-sky-100 text-sky-600",
            session.status === "missed" && "bg-red-100 text-red-500",
            session.status === "rest" && "bg-gray-100 text-gray-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{session.label}</p>
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
          </div>
          <p className="text-xs capitalize text-muted-foreground">
            {session.kind.replace("-", " ")}
            {session.sessionType ? ` · ${session.sessionType}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SelectedDayList({ sessions, selectedDate, today }: SelectedDayListProps) {
  const daySessions = useMemo(
    () => (selectedDate ? getSessionsForDate(sessions, selectedDate) : []),
    [sessions, selectedDate],
  );

  if (!selectedDate) {
    return null;
  }

  const isToday = selectedDate === today;

  return (
    <div data-slot="selected-day-list" className="mt-4 border-t border-gray-200 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-gray-700">
          {formatDateLabel(selectedDate)}
        </h3>
        {isToday && (
          <Badge variant="default" className="text-[10px]">Today</Badge>
        )}
      </div>

      {daySessions.length === 0 ? (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <CalendarDays className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Rest day</p>
            <p className="mt-1 text-xs text-gray-400">
              No training scheduled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {daySessions.map((s, i) => (
            <SessionCard key={`${s.date}-${i}`} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

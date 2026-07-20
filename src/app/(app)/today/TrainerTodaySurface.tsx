"use client";

// Trainer Today surface — the trainer-mode view for /today.
// Ports v1's trainer branch: Quick Actions grid (rose accent), roster summary,
// and recent client completions. Uses existing v2 data seams only — no schema.

import { useRouter } from "next/navigation";
import { Users, Calendar, Dumbbell, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RosterClientDetail, RosterStats } from "@/types/roster";
import type { ClientCompletion } from "./useTrainerTodayData";

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface TrainerTodaySurfaceProps {
  clients: RosterClientDetail[];
  stats: RosterStats;
  recentCompletions: ClientCompletion[];
  isLoading: boolean;
  error: Error | null;
}

export function TrainerTodaySurface({
  clients,
  stats,
  recentCompletions,
  isLoading,
  error,
}: TrainerTodaySurfaceProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
        <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-500">
        Could not load trainer data: {error.message}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick Actions — trainer mode only, rose accent */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-auto py-5 bg-linear-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 flex flex-col items-center gap-2 rounded-2xl shadow-lg shadow-rose-500/20"
          onClick={() => router.push("/clients")}
        >
          <Users className="w-5 h-5" />
          <span className="font-bold text-sm">Clients</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-5 bg-gray-50 border-gray-200 hover:bg-gray-100 flex flex-col items-center gap-2 rounded-2xl"
          onClick={() => router.push("/calendar")}
        >
          <Calendar className="w-5 h-5 text-sky-500" />
          <span className="font-semibold text-sm text-gray-700">Calendar</span>
        </Button>
      </div>

      {/* Roster Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Your Clients
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-500 text-xs h-7"
            onClick={() => router.push("/clients")}
          >
            See All
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-rose-500">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">
                {stats.pending}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-sky-500">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Client list — top 5 */}
        {clients.length > 0 ? (
          <div className="space-y-2">
            {clients.slice(0, 5).map((client) => (
              <Card
                key={client.id}
                className="bg-white border-gray-200 shadow-sm cursor-pointer hover:border-rose-200 transition-colors"
                onClick={() => router.push("/clients")}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={client.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                      {client.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {client.sessions} sessions
                      {client.lastSeen &&
                        ` • Last: ${formatRelativeDate(client.lastSeen)}`}
                    </p>
                  </div>
                  <Badge
                    className={
                      client.status === "active"
                        ? "bg-sky-500/10 text-sky-500"
                        : "bg-amber-500/10 text-amber-500"
                    }
                  >
                    {client.status === "active" ? "Active" : "Pending"}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="py-6 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No clients yet. Add your first client to get started.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-rose-500 hover:bg-rose-600"
                onClick={() => router.push("/clients")}
              >
                <Users className="w-4 h-4 mr-1" />
                Add Client
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Client Completions */}
      {recentCompletions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Recent Client Completions
          </h2>
          <div className="space-y-2">
            {recentCompletions.map((workout) => (
              <Card
                key={workout.id}
                className="bg-white border-gray-200 shadow-sm"
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-rose-100 text-rose-600 text-xs">
                        {workout.clientName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-gray-900">
                        {workout.clientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {workout.workoutName} •{" "}
                        {formatRelativeDate(workout.performedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Done
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick Link — Workout Builder */}
      <Button
        variant="outline"
        className="w-full h-12 border-gray-200 hover:bg-gray-50 justify-start gap-3"
        onClick={() => router.push("/builder")}
      >
        <Dumbbell className="w-5 h-5 text-rose-500" />
        <span className="font-semibold text-gray-700">
          Open Workout Builder
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
      </Button>
    </div>
  );
}

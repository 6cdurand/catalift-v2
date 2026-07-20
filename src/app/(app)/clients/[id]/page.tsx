"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  CheckCircle2,
  Calendar,
  MessageCircle,
  ClipboardList,
} from "lucide-react";
import { useSession, useUserRole } from "@/features/auth";
import { fetchClientProgramsForTrainer, type ClientProgram } from "@/features/programs";
import {
  fetchWorkoutHistory,
  type WorkoutHistoryItem,
} from "@/features/workout-engine/api/fetch-history";
import { fetchClients } from "@/lib/roster";
import type { RosterClientDetail } from "@/types/roster";
import { LoadingState } from "@/components/states";
import { ErrorState } from "@/components/states";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k kg`;
  return `${vol} kg`;
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  const [client, setClient] = useState<RosterClientDetail | null>(null);
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTrainer = role === "trainer";

  useEffect(() => {
    if (!sessionLoading && !roleLoading && user && !isTrainer) {
      router.replace("/today");
    }
  }, [sessionLoading, roleLoading, user, isTrainer, router]);

  useEffect(() => {
    if (sessionLoading || roleLoading || !user || !isTrainer) return;
    let cancelled = false;

    async function load() {
      try {
        const [clientsResult, allPrograms, workoutHistory] = await Promise.all([
          fetchClients(),
          fetchClientProgramsForTrainer(user!.id),
          fetchWorkoutHistory(clientId, 10).catch(() => [] as WorkoutHistoryItem[]),
        ]);

        if (cancelled) return;

        const foundClient = clientsResult.clients.find((c) => c.id === clientId) ?? null;
        if (!foundClient) {
          setError("Client not found");
          setIsLoading(false);
          return;
        }

        setClient(foundClient);
        setPrograms(allPrograms.filter((p) => p.clientId === clientId));
        setHistory(workoutHistory);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load client");
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, roleLoading, user, isTrainer, clientId]);

  if (sessionLoading || roleLoading) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <LoadingState message="Loading client…" />
      </div>
    );
  }

  if (!user || !isTrainer) return null;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <LoadingState message="Loading client…" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <ErrorState
          title={error ?? "Client not found"}
          message="This client may not be in your roster."
          onRetry={() => router.push("/clients")}
        />
      </div>
    );
  }

  const activeProgram = programs.find((p) => p.status === "active");
  const pastPrograms = programs.filter((p) => p.id !== activeProgram?.id);

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.status === "active" ? "Active client" : "Inactive"}
        showBack
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:text-white hover:bg-white/10"
            onClick={() => router.push(`/messages?with=${client.id}`)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
        }
      />

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Profile Summary */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={client.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-rose-100 text-rose-600 text-xl font-semibold">
                  {client.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 truncate">
                    {client.name}
                  </span>
                  <Badge
                    className={
                      client.status === "active"
                        ? "bg-sky-500/10 text-sky-500"
                        : "bg-amber-500/10 text-amber-500"
                    }
                  >
                    {client.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {client.email && (
                  <p className="text-xs text-gray-500 truncate">{client.email}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {client.sessions} sessions
                  </span>
                  {client.lastSeen && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last: {formatDate(client.lastSeen)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Section */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Programs
          </h2>

          {activeProgram ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-rose-500" />
                    <span className="font-semibold text-gray-900">
                      {activeProgram.name}
                    </span>
                  </div>
                  <Badge className="bg-rose-500/10 text-rose-500 capitalize">
                    {activeProgram.phase}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Days per week</p>
                    <p className="font-medium text-gray-900">
                      {activeProgram.weeklyPlan.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Schedule mode</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {activeProgram.scheduleMode}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-gray-200">
                  {activeProgram.weeklyPlan.map((day, i) => (
                    <div
                      key={day.id ?? i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-700">
                        <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                        {day.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {day.blocks?.reduce(
                          (sum, b) => sum + (b.exercises?.length ?? 0),
                          0,
                        ) || 0}{" "}
                        exercises
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No active program</p>
                <p className="text-xs text-gray-400 mt-1">
                  Assign a program from the Builder
                </p>
              </CardContent>
            </Card>
          )}

          {pastPrograms.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-gray-500 mb-2">Past Programs</p>
              {pastPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-gray-700">{prog.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {prog.status} • {prog.weeklyPlan?.length ?? 0} days/week
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Workouts Section */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recent Workouts
          </h2>

          {history.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No workouts recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/workout/${item.id}`)}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.name || "Workout"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(item.performedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatVolume(item.totalVolume)}
                        </p>
                        <p className="text-[10px] uppercase text-gray-400">Volume</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.totalSets}
                        </p>
                        <p className="text-[10px] uppercase text-gray-400">Sets</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deferred sections notice */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 text-center">
              Payments, booking, group management, and onboarding editing are
              coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

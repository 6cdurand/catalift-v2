"use client";

/**
 * /clients/[id] — the trainer client file.
 *
 * Port of `v1: src/app/clients/[id]/page.tsx` (3,415 lines, one
 * component). Tracked section-by-section in `docs/ports/client-file-inventory.md`;
 * this lane (P-06-L1) owns the shell: header identity, the five tabs, the quick
 * action bar, Remove Client, and the Messages tab.
 *
 * Structure is deliberately page-shell + panels: load data, render the header,
 * render five panels from `_components/`. v1's god-file shape is not part of the
 * port.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MessageCircle, Trash2 } from "lucide-react";
import { useSession, useUserRole } from "@/features/auth";
import { fetchClientProgramsForTrainer, type ClientProgram } from "@/features/programs";
import {
  fetchWorkoutHistory,
  type WorkoutHistoryItem,
} from "@/features/workout-engine/api/fetch-history";
import { fetchPersonalBests } from "@/features/workout-engine/api/fetch-personal-bests";
import { ClientPaymentsSection } from "@/features/payments";
import { fetchClients } from "@/lib/roster";
import { removeClient } from "@/features/trainer-ops/api/clients";
import type { RosterClientDetail } from "@/types/roster";
import { LoadingState, ErrorState } from "@/components/states";
import { useActiveWorkoutBanner } from "@/hooks/use-active-workout";
import { ClientProfileCard } from "./_components/ClientProfileCard";
import { ClientQuickActions } from "./_components/ClientQuickActions";
import { ClientStatusBadges } from "./_components/ClientStatusBadges";
import { MessagesPanel } from "./_components/MessagesPanel";
import { OverviewPanel } from "./_components/OverviewPanel";
import { ProgramPanel } from "./_components/ProgramPanel";
import { ProgressPanel } from "./_components/ProgressPanel";
import {
  CLIENT_TABS,
  CLIENT_TAB_LABELS,
  DEFAULT_CLIENT_TAB,
  resolveTab,
  type ClientTab,
} from "./_lib/client-tabs";

// useSearchParams requires a Suspense boundary (same wrapper as
// src/app/workout/builder/page.tsx:103-110).
export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Client" showBack />
          <LoadingState label="Loading client…" />
        </div>
      }
    >
      <ClientDetailContent />
    </Suspense>
  );
}

function ClientDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const activeWorkoutBanner = useActiveWorkoutBanner();

  const [client, setClient] = useState<RosterClientDetail | null>(null);
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [pbCount, setPbCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // v1 seeds the tab from `?tab=` once (`:190`) and never validates it.
  const [activeTab, setActiveTab] = useState<ClientTab>(() =>
    resolveTab(searchParams.get("tab")),
  );
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Remounts ClientPaymentsSection on resume — see the resume effect below.
  const [paymentsEpoch, setPaymentsEpoch] = useState(0);

  const isTrainer = role === "trainer";
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!sessionLoading && !roleLoading && user && !isTrainer) {
      router.replace("/today");
    }
  }, [sessionLoading, roleLoading, user, isTrainer, router]);

  // Guards against a superseded fetch (clientId change / resume overlap)
  // writing stale data over fresh data.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const token = ++requestRef.current;

    const [clientsResult, allPrograms, workoutHistory, pbs] = await Promise.all([
      fetchClients(),
      fetchClientProgramsForTrainer(userId),
      // History and PBs are best-effort: a failure must not blank the page.
      fetchWorkoutHistory(clientId, 10).catch(() => [] as WorkoutHistoryItem[]),
      fetchPersonalBests(clientId).catch(() => null),
    ]);

    if (token !== requestRef.current) return;

    const foundClient = clientsResult.clients.find((c) => c.id === clientId) ?? null;
    if (!foundClient) {
      setError("Client not found");
      return;
    }

    setError(null);
    setClient(foundClient);
    setPrograms(allPrograms.filter((p) => p.clientId === clientId));
    setHistory(workoutHistory);
    setPbCount(pbs ? pbs.length : null);
  }, [userId, clientId]);

  useEffect(() => {
    if (sessionLoading || roleLoading || !userId || !isTrainer) return;
    let cancelled = false;

    async function run() {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load client");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, roleLoading, userId, isTrainer, load]);

  // G-17: the loader is keyed on clientId, so a backgrounded tab used to show
  // stale data until it was remounted. Refetch once, at page level, so no lane
  // has to invent its own. ClientPaymentsSection owns its data via
  // useClientPayments — bumping its key re-runs that hook's load without
  // reaching into a lane-L6 file.
  useEffect(() => {
    if (!userId || !isTrainer) return;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      setPaymentsEpoch((n) => n + 1);
      void load().catch((err) =>
        console.error("[ClientDetailPage] refetch on resume failed:", err),
      );
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, isTrainer, load]);

  // Keep `?tab=` honest in both directions so a copied URL reopens the tab the
  // trainer is actually looking at. history.replaceState (rather than
  // router.replace) keeps this a URL update, not a navigation.
  const changeTab = useCallback((value: string) => {
    const tab = resolveTab(value);
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === DEFAULT_CLIENT_TAB) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleRemoveClient = useCallback(async () => {
    try {
      await removeClient(clientId);
      // Toast AFTER the write resolves — v1 toasted first (G-11).
      toast.success("Client removed from your list");
      router.push("/clients");
    } catch (err) {
      console.error("[ClientDetailPage] removeClient failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not remove this client",
      );
    }
  }, [clientId, router]);

  if (sessionLoading || roleLoading) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <LoadingState label="Loading client…" />
      </div>
    );
  }

  if (!user || !isTrainer) return null;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <LoadingState label="Loading client…" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div>
        <PageHeader title="Client" showBack />
        <ErrorState
          title={error ?? "Client not found"}
          description="This client may not be in your roster."
          onRetry={() => router.push("/clients")}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.username ? `@${client.username}` : undefined}
        showBack
        avatar={
          <button
            type="button"
            onClick={() => setShowProfileCard(true)}
            aria-label={`View ${client.name}'s profile`}
            data-testid="client-avatar-button"
          >
            <Avatar className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all border-2 border-white/20">
              <AvatarImage src={client.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-rose-700 text-white">
                {client.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </button>
        }
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={() => router.push(`/messages?with=${client.id}`)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <ClientStatusBadges status={client.status} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove client"
              data-testid="remove-client-button"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowRemoveConfirm(true)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="grid grid-cols-5 w-auto h-auto mx-4 mt-4 bg-gray-100">
          {CLIENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="text-xs data-[state=active]:bg-white"
            >
              {CLIENT_TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* pb-48 clears the fixed quick-action bar in both of its positions. */}
        <div className="px-4 pt-4 pb-48">
          <TabsContent value="overview">
            <OverviewPanel
              email={client.email}
              lastSeen={client.lastSeen}
              workoutCount={client.sessions}
              history={history}
              onOpenWorkout={(id) => router.push(`/workout/${id}`)}
            />
          </TabsContent>

          <TabsContent value="program">
            <ProgramPanel programs={programs} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressPanel
              history={history}
              onOpenWorkout={(id) => router.push(`/workout/${id}`)}
            />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesPanel me={user.id} clientId={client.id} />
          </TabsContent>

          <TabsContent value="payments">
            <ClientPaymentsSection
              key={`payments-${paymentsEpoch}`}
              clientId={client.id}
            />
          </TabsContent>
        </div>
      </Tabs>

      <ClientQuickActions
        hasActiveWorkoutBanner={!!activeWorkoutBanner}
        onMessage={() => changeTab("messages")}
        onBook={() => router.push(`/clients/${client.id}/book`)}
      />

      <ClientProfileCard
        open={showProfileCard}
        onOpenChange={setShowProfileCard}
        name={client.name}
        username={client.username}
        avatarUrl={client.avatarUrl}
        workoutCount={client.sessions}
        pbCount={pbCount}
      />

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove Client"
        description={`Are you sure you want to remove ${client.name} from your client list? Their account will NOT be deleted — they can still log in. You will lose access to their workouts and progress, and their payment history is kept.`}
        confirmLabel="Remove Client"
        variant="destructive"
        onConfirm={() => void handleRemoveClient()}
        icon={<Trash2 className="w-5 h-5 text-red-400" />}
      />
    </div>
  );
}

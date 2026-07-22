"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Search,
  Calendar,
  Dumbbell,
  MessageCircle,
  ChevronRight,
  Users,
  CheckCircle2,
  Link2,
  ArrowLeft,
  Loader2,
  UsersRound,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useSession, useUserRole, createInvitation } from "@/features/auth";
import { fetchClients } from "@/lib/roster";
import type { RosterClientDetail, RosterStats } from "@/types/roster";

// v2 has no `date-fns`; format a "Mon D" label with Intl.
function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Actions whose v2 backing is not provisioned yet (see the dispatch DEFER list).
function comingSoon(feature: string) {
  toast.info(`${feature} — coming soon`);
}

export default function ClientsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);

  const [clients, setClients] = useState<RosterClientDetail[]>([]);
  const [stats, setStats] = useState<RosterStats>({
    active: 0,
    pending: 0,
    total: 0,
  });
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [viewMode, setViewMode] = useState<"clients" | "groups">("clients");

  // Add Client dialog form state (UI is ported verbatim; submit is deferred).
  const [clientMode, setClientMode] = useState<"create" | "link" | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const isTrainer = role === "trainer";

  // Trainer gate — redirect non-trainers, mirroring v1.
  useEffect(() => {
    if (!sessionLoading && !roleLoading && user && !isTrainer) {
      router.replace("/today");
    }
  }, [sessionLoading, roleLoading, user, isTrainer, router]);

  // Initial roster load once we know the user is a trainer.
  useEffect(() => {
    if (sessionLoading || roleLoading || !user || !isTrainer) return;
    let cancelled = false;
    fetchClients()
      .then((result) => {
        if (cancelled) return;
        setClients(result.clients);
        setStats(result.stats);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load clients");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingClients(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, roleLoading, user, isTrainer]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fetchClients();
      setClients(result.clients);
      setStats(result.stats);
      toast.success("Data synced from cloud");
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateClient = async () => {
    const email = newClientEmail.trim();
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    setIsCreatingClient(true);
    try {
      const inviteLink = await createInvitation(email);
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied — send it to your client");
      setShowAddClient(false);
      setClientMode(null);
      setNewClientName("");
      setNewClientEmail("");
    } catch {
      toast.error("Failed to create invite. Please try again.");
    } finally {
      setIsCreatingClient(false);
    }
  };

  if (sessionLoading || roleLoading) {
    return (
      <div>
        <PageHeader title="Clients" />
        <div className="flex items-center justify-center py-20 text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (!user || !isTrainer) return null;

  const filteredClients = searchQuery
    ? clients.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
    : clients;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${stats.active} active clients`}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-200"
              disabled={isSyncing}
              onClick={handleSync}
            >
              <Loader2 className={`w-4 h-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Add Client</DialogTitle>
                  <DialogDescription>
                    {clientMode === null
                      ? "Does this client already have an account?"
                      : clientMode === "create"
                        ? "Send an invite link to your client's email"
                        : "Link an existing Catalift account"}
                  </DialogDescription>
                </DialogHeader>

                {/* Step 1: Choose Create or Link */}
                {clientMode === null && (
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <Card
                      className="cursor-pointer hover:border-sky-500 transition-colors bg-gray-50 border-gray-200"
                      onClick={() => setClientMode("create")}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto">
                          <UserPlus className="h-6 w-6 text-sky-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Create New</h3>
                        <p className="text-xs text-gray-500">New client, no account yet</p>
                      </CardContent>
                    </Card>
                    <Card
                      className="cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 border-gray-200"
                      onClick={() => setClientMode("link")}
                    >
                      <CardContent className="p-4 text-center space-y-2">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                          <Link2 className="h-6 w-6 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Link Existing</h3>
                        <p className="text-xs text-gray-500">Has a Catalift account</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Create New Account Form */}
                {clientMode === "create" && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClientMode(null)}
                      className="text-gray-500"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    <div className="space-y-2">
                      <Label className="text-gray-700">Client Name *</Label>
                      <Input
                        type="text"
                        placeholder="John Smith"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">
                        Email <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="client@example.com"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900"
                      />
                    </div>
                    <Button
                      onClick={handleCreateClient}
                      disabled={isCreatingClient || !newClientEmail.trim()}
                      className="w-full bg-rose-500 hover:bg-rose-600"
                    >
                      {isCreatingClient ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Send Invite"
                      )}
                    </Button>
                  </div>
                )}

                {/* Link Existing Account */}
                {clientMode === "link" && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClientMode(null);
                        setLinkSearchQuery("");
                      }}
                      className="text-gray-500"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    <div className="space-y-2">
                      <Label className="text-gray-700">Search accounts</Label>
                      <Input
                        type="text"
                        placeholder="Search by name or email..."
                        value={linkSearchQuery}
                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900"
                      />
                    </div>

                    <p className="text-center text-gray-500 py-8 text-sm">
                      Linking an existing account is coming soon.
                    </p>

                    <Button
                      onClick={() => comingSoon("Link client")}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      Link Client
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="px-4 py-4 pb-24">
        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === "clients" ? "default" : "outline"}
            className={
              viewMode === "clients"
                ? "bg-rose-500 hover:bg-rose-600"
                : "border-gray-200"
            }
            onClick={() => setViewMode("clients")}
          >
            <Users className="w-4 h-4 mr-2" />
            Clients ({stats.total})
          </Button>
          <Button
            variant={viewMode === "groups" ? "default" : "outline"}
            className={
              viewMode === "groups"
                ? "bg-blue-500 hover:bg-blue-600"
                : "border-gray-200"
            }
            onClick={() => setViewMode("groups")}
          >
            <UsersRound className="w-4 h-4 mr-2" />
            Groups (0)
          </Button>
        </div>

        {viewMode === "clients" ? (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-rose-500">{stats.active}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
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

            {/* Clients List */}
            <div>
              {isLoadingClients ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
                            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                          <div className="h-8 bg-gray-200 animate-pulse rounded" />
                          <div className="h-8 bg-gray-200 animate-pulse rounded" />
                          <div className="h-8 bg-gray-200 animate-pulse rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-500 mb-2">No clients found</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Add your first client to get started
                    </p>
                    <Button
                      className="bg-rose-500 hover:bg-rose-600"
                      onClick={() => setShowAddClient(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Client
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((client) => (
                    <Card
                      key={client.id}
                      className="bg-white border-gray-200 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={client.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-gray-100 text-gray-600">
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
                                {client.status === "active" ? "Active" : "Non-Active"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                              <span className="flex items-center gap-1 text-gray-500">
                                <CheckCircle2 className="w-3 h-3" />
                                {client.sessions} sessions
                              </span>
                            </div>
                            {client.lastSeen && (
                              <p className="text-xs text-gray-600 mt-1">
                                Last: {formatMonthDay(client.lastSeen)}
                              </p>
                            )}
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-900 min-h-[44px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/messages");
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-900 min-h-[44px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/builder?assignClient=${client.id}`);
                            }}
                          >
                            <Dumbbell className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-900 min-h-[44px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              comingSoon("Booking");
                            }}
                          >
                            <Calendar className="w-4 h-4 mr-1" />
                            Book
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Groups View — deferred: no `client_groups` table in v2 yet. */
          <div className="space-y-4">
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600"
              onClick={() => comingSoon("Groups")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Group
            </Button>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <UsersRound className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-400 mb-2">No groups yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Group fitness classes are coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

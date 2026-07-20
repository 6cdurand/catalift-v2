"use client";

// Builder landing (Lane B #2) — verbatim port of v1 `app/builder/page.tsx`.
// The multi-step ProgramBuilder itself already exists at /program/builder; this
// screen is the trainer's home for creating + managing programs. Data layer is
// swapped to v2: client_programs (fetch + delete, RLS trainer-owned) hydrated via
// the programs store (G-09 merge), client names via the trainer-ops roster, and
// saved blocks via saved_blocks. No schema/auth changes.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Dumbbell,
  ChevronRight,
  Layers,
  CalendarDays,
  Users,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useSession, useUserRole } from "@/features/auth";
import {
  useProgramsStore,
  fetchClientProgramsForTrainer,
  deleteClientProgram,
  listBlocks,
  type SavedBlock,
} from "@/features/programs";
import { fetchRoster } from "@/lib/roster";

// Block-type accent colours (v1 palette, mapped to v2 SavedBlockType).
function blockAccent(type: SavedBlock["block_type"]): {
  bg: string;
  fg: string;
} {
  switch (type) {
    case "circuit":
      return { bg: "bg-purple-500/20", fg: "text-purple-400" };
    case "cardio":
      return { bg: "bg-red-500/20", fg: "text-red-400" };
    case "superset":
      return { bg: "bg-orange-500/20", fg: "text-orange-400" };
    default:
      return { bg: "bg-blue-500/20", fg: "text-blue-400" };
  }
}

export default function BuilderPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const isTrainer = role === "trainer";

  const clientPrograms = useProgramsStore((s) => s.clientPrograms);
  const hydrateClientPrograms = useProgramsStore(
    (s) => s.hydrateClientPrograms,
  );
  const removeClientProgram = useProgramsStore((s) => s.removeClientProgram);

  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [savedBlocks, setSavedBlocks] = useState<SavedBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [programToDelete, setProgramToDelete] = useState<{
    id: string;
    name: string;
    clientName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Placeholder for actions whose v2 backing route/table does not exist yet.
  const comingSoon = (feature: string) => toast(`${feature} is coming soon`);

  // Trainer gate — non-trainers go to their program view (v1 parity: /program).
  useEffect(() => {
    if (!sessionLoading && !roleLoading && user && !isTrainer) {
      router.replace("/program");
    }
  }, [sessionLoading, roleLoading, user, isTrainer, router]);

  // Hydrate client programs (store), client names (roster) and saved blocks once
  // we know the user is a trainer. setState lives in the promise callbacks.
  useEffect(() => {
    if (sessionLoading || roleLoading || !user || !isTrainer) return;
    let cancelled = false;
    Promise.all([
      fetchClientProgramsForTrainer(user.id),
      fetchRoster(),
      listBlocks(),
    ])
      .then(([programs, roster, blocks]) => {
        if (cancelled) return;
        hydrateClientPrograms(programs);
        const names: Record<string, string> = {};
        roster.forEach((c) => {
          names[c.id] = c.name;
        });
        setClientNames(names);
        setSavedBlocks(blocks);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load builder");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, roleLoading, user, isTrainer, hydrateClientPrograms]);

  const confirmDelete = async () => {
    if (!programToDelete) return;
    setIsDeleting(true);
    const result = await deleteClientProgram(programToDelete.id);
    setIsDeleting(false);
    if (result.ok) {
      removeClientProgram(programToDelete.id);
      toast.success(`Deleted ${programToDelete.name}`);
      setProgramToDelete(null);
    } else {
      toast.error("Failed to delete program");
    }
  };

  if (sessionLoading || roleLoading) {
    return (
      <div>
        <PageHeader title="Builder" subtitle="Create workouts & blocks" />
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || !isTrainer) return null;

  const activePrograms = clientPrograms.filter((p) => p.status === "active");

  return (
    <div>
      <PageHeader title="Builder" subtitle="Create workouts & blocks" />

      <div className="px-4 py-4 space-y-5">
        {/* Create Actions */}
        <div className="space-y-3">
          <Card
            className="bg-gradient-to-r from-sky-500/20 to-blue-500/20 border-sky-500/30 cursor-pointer hover:border-sky-500/50 transition-all"
            onClick={() => comingSoon("Standalone workout builder")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-500/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Build New Workout
                  </h3>
                  <p className="text-sm text-gray-500">
                    Create with blocks, exercises & circuits
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-all"
            onClick={() => router.push("/program/select")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create Program</h3>
                  <p className="text-sm text-gray-500">
                    Multi-day plan — start fresh or use a template
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </div>

        {/* Active Client Programs */}
        {activePrograms.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                Active Programs
              </h2>
              <Badge
                variant="secondary"
                className="bg-emerald-500/20 text-emerald-400 text-xs"
              >
                {activePrograms.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {activePrograms.map((program) => {
                const clientName = clientNames[program.clientId] || "Client";
                return (
                  <Card
                    key={program.id}
                    className="bg-white border-gray-200 shadow-sm cursor-pointer hover:border-emerald-500/30 transition-colors"
                    onClick={() => comingSoon("Program detail")}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {program.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {clientName} • {program.weeklyPlan?.length || 0}{" "}
                            days/week • {program.phase}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgramToDelete({
                              id: program.id,
                              name: program.name,
                              clientName,
                            });
                          }}
                          aria-label="Delete program"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Saved Blocks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Saved Blocks
            </h2>
            <Badge
              variant="secondary"
              className="bg-purple-500/20 text-purple-400 text-xs"
            >
              {savedBlocks.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : savedBlocks.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="py-6 text-center">
                <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No saved blocks</p>
                <p className="text-xs text-gray-400 mt-1">
                  Save blocks from the program builder
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {savedBlocks.slice(0, 5).map((block) => {
                  const accent = blockAccent(block.block_type);
                  return (
                    <Card
                      key={block.id}
                      className="bg-white border-gray-200 shadow-sm"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.bg}`}
                          >
                            <Dumbbell className={`w-4 h-4 ${accent.fg}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {block.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {block.block_type} •{" "}
                              {block.block_data?.exercises?.length || 0} exercises
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {savedBlocks.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{savedBlocks.length - 5} more blocks
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </section>
      </div>

      {/* Delete program confirmation */}
      <AlertDialog
        open={!!programToDelete}
        onOpenChange={(open) => {
          if (!open) setProgramToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-semibold">{programToDelete?.name}</span> from{" "}
              {programToDelete?.clientName}&apos;s app — they&apos;ll no longer
              see it in their program tab, Today page, or calendar.
              <br />
              <br />
              Past workouts already completed stay in their history. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

// Book Session — trainer books a PT session / consultation / assessment with
// a client (P-02). Ported from v1's `clients/[id]/book/page.tsx` (537 lines);
// see `.pipeline`/brief `booking-2026-08-05/P-02-book-a-client.md` for the
// section-by-section port verdict. The one real rewrite is `handleSubmit`:
// v1 wrote to a localStorage Zustand `BookingRequest` store, v2 writes one
// `calendar_events` row via `createCalendarEvent` (already shipped by #106).
//
// Re-themed to v2's light theme (trap §5e) — v1's booking page is dark
// (`bg-gray-950` etc); v2's client file is `bg-white border-gray-200
// shadow-sm`. Layout/copy/structure otherwise ported verbatim.

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  Send,
  Dumbbell,
  FileText,
  Zap,
} from "lucide-react";
import { useSession, useUserRole } from "@/features/auth";
import { fetchClients } from "@/lib/roster";
import type { RosterClientDetail } from "@/types/roster";
import {
  fetchClientProgramsForTrainer,
  selectActivePrograms,
  type ClientProgram,
} from "@/features/programs";
import { allTrainerTemplates } from "@/lib/trainerTemplates";
import { createCalendarEvent } from "@/features/calendar/api/events";
import { LoadingState, ErrorState } from "@/components/states";
import {
  buildDateOptions,
  calculateEndTime,
  sessionDurations,
  sessionTypes,
  timeSlots,
  toEventType,
  workoutSelectionToEventFields,
  type UiSessionType,
  type WorkoutType,
} from "./_lib/booking";

const dayLabels = ["A", "B", "C", "D", "E", "F", "G"];

export default function BookClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const isTrainer = role === "trainer";

  const [client, setClient] = useState<RosterClientDetail | null>(null);
  const [activeProgram, setActiveProgram] = useState<ClientProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const dateOptions = useMemo(() => buildDateOptions(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value ?? "");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] = useState<UiSessionType>("pt_session");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [workoutType, setWorkoutType] = useState<WorkoutType>("program");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

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
        const [clientsResult, programs] = await Promise.all([
          fetchClients(),
          fetchClientProgramsForTrainer(user!.id),
        ]);
        if (cancelled) return;

        const foundClient = clientsResult.clients.find((c) => c.id === clientId) ?? null;
        if (!foundClient) {
          setError("Client not found");
          setIsLoading(false);
          return;
        }

        const clientPrograms = programs.filter((p) => p.clientId === clientId);
        const { baseProgram } = selectActivePrograms(clientPrograms, new Date().toISOString().slice(0, 10));

        setClient(foundClient);
        setActiveProgram(baseProgram);
        setWorkoutType(baseProgram ? "program" : "template");
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

  const programDays = useMemo(() => {
    if (!activeProgram) return [];
    return activeProgram.weeklyPlan.map((day, i) => ({
      id: day.id ?? `day-${i}`,
      label: `Day ${dayLabels[i] ?? i + 1}`,
      exerciseCount: day.blocks.reduce((sum, b) => sum + b.exercises.length, 0),
    }));
  }, [activeProgram]);

  const handleSubmit = async () => {
    if (!user?.id || !clientId) return;
    setIsSubmitting(true);
    try {
      const endTime = calculateEndTime(selectedTime, duration);
      const eventType = toEventType(sessionType);
      const sessionTypeLabel = sessionTypes.find((t) => t.value === sessionType)?.label ?? "Session";
      const workoutFields =
        eventType === "session"
          ? workoutSelectionToEventFields({
              workoutType,
              programId: activeProgram?.id,
              programDayIndex: selectedDayIndex,
              templateSlug: selectedTemplateId || undefined,
            })
          : {};

      await createCalendarEvent({
        title: `${sessionTypeLabel} with ${client?.name ?? "client"}`,
        type: eventType,
        date: selectedDate,
        startTime: selectedTime,
        endTime,
        duration: parseInt(duration, 10),
        clientId,
        ...workoutFields,
        location: location || undefined,
        notes: notes || undefined,
        clientConfirmed: autoConfirm,
      });

      toast.success(autoConfirm ? "Session booked and confirmed!" : "Booking request sent to client");
      router.push(`/clients/${clientId}`);
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || roleLoading || isLoading) {
    return (
      <div>
        <PageHeader title="Book Session" showBack />
        <LoadingState label="Loading client…" />
      </div>
    );
  }

  if (!user || !isTrainer) return null;

  if (error || !client) {
    return (
      <div>
        <PageHeader title="Book Session" showBack />
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
      <PageHeader title="Book Session" subtitle={`with ${client.name}`} showBack />

      <div className="px-4 py-6 pb-32 space-y-6">
        {/* Client Info */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={client.avatarUrl ?? undefined} />
                <AvatarFallback>{client.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-gray-900 font-medium">{client.name}</h3>
                {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-500" />
            Select Date
          </Label>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Selection */}
        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-500" />
            Select Time
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                size="sm"
                variant={selectedTime === time ? "default" : "outline"}
                className={
                  selectedTime === time
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-gray-700">Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessionDurations.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Session Type */}
        <div className="space-y-2">
          <Label className="text-gray-700">Session Type</Label>
          <Select
            value={sessionType}
            onValueChange={(v) => setSessionType(v as UiSessionType)}
          >
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessionTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Workout Type Selection */}
        {sessionType === "pt_session" && (
          <div className="space-y-3">
            <Label className="text-gray-700 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-rose-500" />
              Workout Plan
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={workoutType === "program" ? "default" : "outline"}
                className={
                  workoutType === "program"
                    ? "bg-rose-500 hover:bg-rose-600 flex-col h-auto py-3"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 flex-col h-auto py-3"
                }
                onClick={() => setWorkoutType("program")}
              >
                <FileText className="w-5 h-5 mb-1" />
                <span className="text-xs">Follow Program</span>
              </Button>
              <Button
                variant={workoutType === "template" ? "default" : "outline"}
                className={
                  workoutType === "template"
                    ? "bg-sky-500 hover:bg-sky-600 flex-col h-auto py-3"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 flex-col h-auto py-3"
                }
                onClick={() => setWorkoutType("template")}
              >
                <Zap className="w-5 h-5 mb-1" />
                <span className="text-xs">Template</span>
              </Button>
              <Button
                variant={workoutType === "empty" ? "default" : "outline"}
                className={
                  workoutType === "empty"
                    ? "bg-gray-600 hover:bg-gray-700 flex-col h-auto py-3"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 flex-col h-auto py-3"
                }
                onClick={() => setWorkoutType("empty")}
              >
                <Dumbbell className="w-5 h-5 mb-1" />
                <span className="text-xs">Empty</span>
              </Button>
            </div>

            {/* Program Day Selection */}
            {workoutType === "program" && (
              <div className="space-y-2 mt-3">
                {activeProgram ? (
                  <>
                    <Label className="text-gray-500 text-sm">
                      Select Workout Day ({activeProgram.name})
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {programDays.map((day, i) => (
                        <Button
                          key={day.id}
                          variant={selectedDayIndex === i ? "default" : "outline"}
                          className={
                            selectedDayIndex === i
                              ? "bg-rose-500 hover:bg-rose-600 flex-col h-auto py-2"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50 flex-col h-auto py-2"
                          }
                          onClick={() => setSelectedDayIndex(i)}
                        >
                          <span className="font-bold">{day.label}</span>
                          <span className="text-xs opacity-70">{day.exerciseCount} exercises</span>
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm">
                      No program assigned. Select a template or assign a program first.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-amber-700 border-amber-300"
                      onClick={() => router.push(`/clients/${clientId}`)}
                    >
                      Assign Program
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Template Selection */}
            {workoutType === "template" && (
              <div className="space-y-2 mt-3">
                <Label className="text-gray-500 text-sm">Select Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 w-full">
                    <SelectValue placeholder="Choose a workout template..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allTrainerTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-gray-500">
                    {allTrainerTemplates.find((t) => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Empty Workout Info */}
            {workoutType === "empty" && (
              <div className="p-3 bg-gray-50 rounded-lg mt-3">
                <p className="text-gray-500 text-sm">
                  Start with a blank workout and add exercises during the session.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            Location (optional)
          </Label>
          <Input
            placeholder="e.g., Catalift Hamilton"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-white border-gray-200 text-gray-900"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-gray-700">Notes (optional)</Label>
          <Textarea
            placeholder="Add any notes for this session..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white border-gray-200 text-gray-900 min-h-[80px]"
          />
        </div>

        {/* Auto-confirm Toggle */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-medium">Auto-confirm booking</p>
                <p className="text-sm text-gray-500">Skip client confirmation and book directly</p>
              </div>
              <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="p-4">
            <h4 className="text-rose-600 font-medium mb-2">Booking Summary</h4>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <span className="text-gray-500">Date:</span>{" "}
                {new Date(selectedDate).toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-gray-700">
                <span className="text-gray-500">Time:</span> {selectedTime} -{" "}
                {calculateEndTime(selectedTime, duration)}
              </p>
              <p className="text-gray-700">
                <span className="text-gray-500">Type:</span>{" "}
                {sessionTypes.find((t) => t.value === sessionType)?.label}
              </p>
              {location && (
                <p className="text-gray-700">
                  <span className="text-gray-500">Location:</span> {location}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-white via-white">
        <Button
          className="w-full bg-rose-500 hover:bg-rose-600 h-12 text-lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Creating..."
          ) : autoConfirm ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Confirm Booking
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Send Booking Request
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

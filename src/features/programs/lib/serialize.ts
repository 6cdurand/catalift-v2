// Row <-> domain mapping for the program tables (Programs Wave 1).
// Keeps the camelCase domain types (ported from v1) decoupled from the snake_case
// Supabase rows. saved_programs maps column-for-column; client_programs stores the
// full ClientProgram snapshot in `program_data` while the scalar columns
// (status, dates, next_workout_index) remain the authoritative source on read.

import type { Database, Json } from "@/types/database";
import type {
  ClientProgram,
  ProgramDay,
  SavedProgram,
  ScheduleMode,
  TrainingGoal,
  TrainingPhase,
} from "../types";

type SavedRow = Database["public"]["Tables"]["saved_programs"]["Row"];
type SavedInsert = Database["public"]["Tables"]["saved_programs"]["Insert"];
type ClientRow = Database["public"]["Tables"]["client_programs"]["Row"];
type ClientInsert = Database["public"]["Tables"]["client_programs"]["Insert"];

export function savedProgramToRow(p: SavedProgram): SavedInsert {
  return {
    id: p.id,
    trainer_id: p.trainerId,
    name: p.name,
    description: p.description ?? null,
    phase: p.phase,
    goals: p.goals,
    duration_weeks: p.durationWeeks,
    days_per_week: p.daysPerWeek,
    schedule_mode: p.scheduleMode ?? null,
    auto_repeat: p.autoRepeat,
    days: p.days as unknown as Json,
    source_template_id: p.sourceTemplateId ?? null,
    times_assigned: p.timesAssigned,
    last_assigned_at: p.lastAssignedAt ?? null,
  };
}

export function rowToSavedProgram(r: SavedRow): SavedProgram {
  return {
    id: r.id,
    trainerId: r.trainer_id,
    name: r.name,
    description: r.description ?? undefined,
    phase: (r.phase ?? "none") as TrainingPhase,
    goals: (r.goals ?? []) as TrainingGoal[],
    durationWeeks: r.duration_weeks,
    daysPerWeek: r.days_per_week,
    scheduleMode: (r.schedule_mode ?? undefined) as ScheduleMode | undefined,
    autoRepeat: r.auto_repeat,
    days: ((r.days as unknown as ProgramDay[]) ?? []),
    sourceTemplateId: r.source_template_id ?? undefined,
    timesAssigned: r.times_assigned,
    lastAssignedAt: r.last_assigned_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function clientProgramToRow(p: ClientProgram): ClientInsert {
  return {
    id: p.id,
    trainer_id: p.trainerId,
    client_id: p.clientId,
    name: p.name,
    status: p.status,
    start_date: p.startDate || null,
    end_date: p.endDate ?? null,
    program_data: p as unknown as Json,
    next_workout_index: p.nextWorkoutIndex,
  };
}

export function rowToClientProgram(r: ClientRow): ClientProgram {
  const snapshot = (r.program_data ?? {}) as Partial<ClientProgram>;
  return {
    // structural fields come from the stored snapshot
    goal: snapshot.goal ?? "general_fitness",
    phase: snapshot.phase ?? "none",
    weeklyPlan: snapshot.weeklyPlan ?? [],
    scheduleMode: snapshot.scheduleMode ?? "flexible",
    trainingDaysPerWeek: snapshot.trainingDaysPerWeek ?? 0,
    selectedDays: snapshot.selectedDays ?? [],
    cycleAcrossWeeks: snapshot.cycleAcrossWeeks ?? false,
    sessionPTMap: snapshot.sessionPTMap ?? {},
    autoRepeat: snapshot.autoRepeat ?? false,
    // scalar columns are authoritative on read
    id: r.id,
    trainerId: r.trainer_id,
    clientId: r.client_id,
    name: r.name,
    status: r.status as ClientProgram["status"],
    nextWorkoutIndex: r.next_workout_index,
    startDate: r.start_date ?? snapshot.startDate ?? "",
    endDate: r.end_date ?? snapshot.endDate,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

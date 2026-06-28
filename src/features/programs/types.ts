// Program domain types (Programs Wave 1).
// PORTED verbatim from v1 `src/types/index.ts` (program-related subset). Only the
// quote style is adapted to the v2 repo convention; the type shapes are unchanged
// (G-19). The persisted shapes align to the `saved_programs` / `client_programs`
// tables added in migration 00007 — see .pipeline/v2-programs-w1/spec.md.

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type BlockType = "warmup" | "work" | "circuit" | "cardio" | "cooldown";
export type TrainingPhase =
  | "foundation"
  | "strength"
  | "performance"
  | "return"
  | "hypertrophy"
  | "endurance"
  | "mobility"
  | "none";
export type TrainingGoal =
  | "hypertrophy"
  | "strength"
  | "general_fitness"
  | "weight_loss"
  | "fat_loss" // alias for weight_loss from v1
  | "conditioning"
  | "endurance"
  | "mobility";
export type MovementPattern =
  | "compound"
  | "isolation"
  | "bodyweight"
  | "cardio";
export type ScheduleMode = "fixed" | "flexible";

export interface ProgramExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  movementPattern: MovementPattern;
  sets: number;
  reps: string;
  rest: string;
  repType?: string;
  setStyle?: string;
  tempo?: string;
  notes?: string;
}

export interface ProgramBlock {
  id: string;
  type: BlockType;
  name: string;
  exercises: ProgramExercise[];
}

export interface ProgramDay {
  id: string;
  label: string;
  scheduledDay?: Weekday;
  blocks: ProgramBlock[];
}

export interface ClientProgram {
  id: string;
  clientId: string;
  trainerId: string;
  name: string; // v1: templateName
  status: "active" | "completed" | "paused" | "archived";
  phase: TrainingPhase;
  goal: TrainingGoal;
  weeklyPlan: ProgramDay[];
  scheduleMode: ScheduleMode;
  trainingDaysPerWeek: number;
  selectedDays: Weekday[];
  cycleAcrossWeeks: boolean;
  sessionPTMap: Record<number, "pt" | "personal">;
  nextWorkoutIndex: number;
  autoRepeat: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProgram {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  phase: TrainingPhase;
  goals: TrainingGoal[];
  durationWeeks: number;
  daysPerWeek: number;
  scheduleMode?: ScheduleMode;
  autoRepeat: boolean;
  days: ProgramDay[];
  sourceTemplateId?: string;
  timesAssigned: number;
  lastAssignedAt?: string;
  createdAt: string;
  updatedAt: string;
}
